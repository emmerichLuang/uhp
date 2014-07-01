#!/usr/bin/env python
# coding=utf-8

import os,sys,time
import re
import json

#for debug
#commondir=os.path.join( os.getenv('UHP_HOME'),"uhpcommon");
#sys.path.append(commondir)

import config
import mail_center
import database
from lib.manager import Manager
from lib.logger import log
from lib import contants
from model.alarm import *

class AlarmCallbackManager(Manager):
    def __init__(self):
        self.cb_map = AlarmCallbackMap()
        self.key_word_map = {}

    def diff_key_word(self, alarm_list):
        #对比key_word_map得到新增和减少的key_word
        new_key_word = []
        old_key_word = []
        current_key_word = {}
        
        temp_key_msg_map = {}

        #计算新增的key_word 并记录current_key_word
        for alarm_state in alarm_list:
            key_word = alarm_state['key_word']
            current_key_word[key_word] = alarm_state
            #temp_key_msg_map[key_word] = alarm_state['msg'] 

        #计算解除的key_word
        for (key_word, info) in self.key_word_map.items():
            count = info['count']
            if not current_key_word.has_key(key_word) :
                if count >= config.alarm_least_count:
                    msg = u"告警解除,连续告警次数为%d 时间%d秒." % (count,count*config.alarm_interval)
                    old_key_word.append({"key_word":key_word,"msg":msg})

        #合并得到最新的key_word
        new_map = {}
        for (key_word,alarm_state) in current_key_word.items():
            if self.key_word_map.has_key(key_word) :
                now_count = self.key_word_map[key_word]['count']
            else:
                now_count = 0
            new_count = now_count + 1
            new_map[key_word] = {}
            new_map[key_word]['count'] = new_count 
            new_map[key_word]['msg'] = alarm_state['msg']

            if new_count == config.alarm_least_count :
                new_key_word.append({"key_word":key_word,"msg":alarm_state['msg']})

        self.key_word_map = new_map
        return (new_key_word,old_key_word)

    def deal_alarm_list(self,alarm_list):
        new_key_word,old_key_word = self.diff_key_word(alarm_list)
        mail_center.push_key_word_map(self.key_word_map)
        
        session = database.getSession()
        #更新数据库的alarm_now表
        for alarm_now in session.query(AlarmNow):
            session.delete(alarm_now)

        for (key_word,info) in self.key_word_map.items():
            end = key_word.find('(')
            host = key_word[0:end]
            session.add(AlarmNow(key_word,host,info['msg'],"ERROR",info['count'],int(time.time())))

        session.commit()

        #根据连续告警次数尝试进行修复动作
        try:
            fix_list = []
            for auto_fix in session.query(AlarmAutofix):
                fix_list.append( auto_fix.format() )

            for (key_word,info) in self.key_word_map.items():
                count = info['count']
                for auto_fix in fix_list:
                    match = auto_fix['pattern'].match(key_word)
                    if match and ( count == auto_fix['count'] or count == auto_fix['count']*2 ) :
                        end = key_word.find('(')
                        host = key_word[0:end]
                        log.info(" build the auto fix tasks: %s %s %s " %(host,auto_fix['role'],auto_fix['task']))
                        database.build_task(session,"auto_fix",auto_fix['service'],host,auto_fix['role'],auto_fix['task'])
        except:
            log.exception("autofix catch exception")

        try:
            #发出邮件 记录动作
            ignore_key_word = session.query(AlarmAssist).filter(AlarmAssist.name=="ignore_key_word").first()
            ignore_list = []
            if ignore_key_word != None:
                #ignore_list = ignore_key_word.value.split(",") 
                for str in ignore_key_word.value.split(","):
                    if len(str) >1 :
                        ignore_list.append( re.compile(str) )
            #log.info(ignore_list)

            for alarm_state in new_key_word:
                key_word = alarm_state['key_word']
                session.add( AlarmList(alarm_state['key_word'], "", alarm_state['msg'], "ERROR", int(time.time()) ))
                if self.is_match(ignore_list,key_word):
                    log.info("ignore %s" % key_word)
                else:
                    self._callback(alarm_state)

            for alarm_state in old_key_word:
                key_word = alarm_state['key_word']
                session.add( AlarmList(alarm_state['key_word'], "", alarm_state['msg'], "INFO", int(time.time()) ))
                if self.is_match(ignore_list,key_word):
                    log.info("ignore %s" % key_word)
                else:
                    self._callback(alarm_state)

            session.commit()
        except:
            log.exception("deal callback catch exception")
        session.close()

    def is_match(self, pattern_list, key_word):
        for pattern in pattern_list:
            if pattern.match(key_word):
                return True
        return False


    def _callback(self, alarm_state):
            
        ##节省重复反射时间
        #if rule.callback_func == None :
        #    rule.callback_func = self._parse_callback(rule.callback)

        #self.cb_map.rule = rule
        #self.cb_map.host = host
        ##调用base callback
        #apply(self.cb_map.base_callback, exp_result)
        ##调用callback
        #apply(rule.callback_func, exp_result)

        self.cb_map.send_mail(alarm_state)
        
    def _parse_callback(self, func_name):
       if hasattr(self.cb_map, func_name) :
           return getattr(self.cb_map, func_name)
       else:
           raise Exception("CallBackError","can't find %s in callback map" % func_name)

class AlarmCallbackMap:
    '''
    回调的方式集合类
    回调会接收expression返回的元祖作为输入
    当前共有两个输入:  告警关键字 key_word  详细信息 msg
    此外,回调函数还可以使用self.rule获取当前判断的rule
    self.host 获取当前的判断的host
    '''
    
    def __init__(self):
        pass

    def print_log(self, alarm_state):
        log.info("%s %s" % (self.rule.name, state, msg))

    def send_mail(self, alarm_state):
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        alarm_info = alarm_state.copy()
        alarm_info["ts"] = now
        mail_center.add_alarm_info(alarm_info)
        log.error("send mail %s %s" % (alarm_info['key_word'],alarm_info['msg']) )

if __name__ == "__main__":
    #print get_http("http://mob616:50088/ws/v1/cluster/apps?state=RUNNING")
    manager = AlarmCallbackManager()
    alarm_list = [{"key_word":"a","msg":"m1"},{"key_word":"b","msg":"m2"}]
    new_key_word,old_key_word = manager.diff_key_word(alarm_list)
    print new_key_word
    print old_key_word
    alarm_list = [{"key_word":"a","msg":"m1"},{"key_word":"b","msg":"m2"}]
    new_key_word,old_key_word = manager.diff_key_word(alarm_list)
    print new_key_word
    print old_key_word
    alarm_list = [{"key_word":"a","msg":"m1"},{"key_word":"b","msg":"m2"}]
    new_key_word,old_key_word = manager.diff_key_word(alarm_list)
    print new_key_word
    print old_key_word
    alarm_list = [{"key_word":"a","msg":"m1"},{"key_word":"b","msg":"m2"}]
    new_key_word,old_key_word = manager.diff_key_word(alarm_list)
    print new_key_word
    print old_key_word
    alarm_list = [{"key_word":"c","msg":"m1"},{"key_word":"b","msg":"m2"}]
    new_key_word,old_key_word = manager.diff_key_word(alarm_list)
    print new_key_word
    print old_key_word
