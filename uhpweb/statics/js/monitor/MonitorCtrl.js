
uhpApp.controller('MonitorCtrl', ['$scope', '$rootScope', '$http', '$sce','$timeout', function($scope, $rootScope, $http, $sce, $timeout){
 
	$scope.init=function(){
		//初始化service的静态信息
		$http({
	    method: 'GET',
	    url: '/monitorback/submenu'
	  }).success(function(response, status, headers, config){
      if(response["ret"] != "ok") {
	  	  $rootScope.alert("服务失败:" + response['msg']);
        return false;
      }
	  	$scope.monmenu = response["submenu"];
      $scope.setActiveMonMenu($scope.monmenu[0]);

	  }).error(function(data, status) {
	  	$rootScope.alert("发送请求失败:" + data + ":" + status);
	  });
	}

  $scope.init();

}])

uhpApp.controller('MoniOverviewCtrl', ['$scope', '$rootScope', '$http', '$sce','$timeout', function($scope, $rootScope, $http, $sce, $timeout){

}]);

uhpApp.controller('MoniHostCtrl', ['$scope', '$rootScope', '$http', '$sce','$timeout', function($scope, $rootScope, $http, $sce, $timeout){
	$scope.init=function(){
    /**
     * for show  
     * { precisions:[{name:,display:}], precision:'',
     *   metrics:[{name:,display:}], metric:'',
     *   hosts:[''], host:'',
     *   hosts_metric:[{host:, x:, y:}],
     *   host_metrics:[{metric:, x:, y:}]
     * }
     **/
    $scope.show={};

    $rootScope.myHttp('GET', '/monitorback/show_info', {}, function(res){
      $scope.show=res['data'];
    });
    
    // host_metric:{metric:,x:,y:}
    function make_chartOpt(host_metric){
      ////时间转换，从时间戳转为可读
      //host_metric.r sec = parseInt($scope.show.precision.substr(1));
      //console.debug(sec);
      //host_metric.x = $.map(host_metric.x, function(n){
      //  return sec>86400 ? date('n-j/H:i', n): date('H:i', n);
      //});
      ////转换null值为echart要求格式
      //host_metric.y = $.map(host_metric.y, function(n){
      //  return (n===null)?'-':n;
      //});

      //return {
      //    tooltip : { trigger: 'axis' },
      //    legend: { x:'left', data:[host_metric.metric] },
      //    toolbox: {
      //        show : true,
      //        feature : {
      //            mark : {show: false},
      //            dataView : {show: false, readOnly: false},
      //            magicType : {show: true, type: ['line', 'bar', 'stack']},
      //            restore : {show: false},
      //            saveAsImage : {show: true},
      //            dataZoom:{show: true}
      //        }
      //    },
      //    dataZoom: {show:true},
      //    calculable : false,
      //    xAxis : [ { type : 'category', data : host_metric.x } ],
      //    yAxis : [ { type : 'value', splitArea : {show:true} } ],
      //    series : [ { name:$scope.show.metric, type:'bar', data:host_metric.y } ]
      //}
    }

    function onSelect(){
      console.log('precision:' + $scope.show.precision);
      console.log('metric:' + $scope.show.metric);
      if(!$scope.show.precision || !$scope.show.metric) return;
      $rootScope.myHttp('POST', '/monitorback/show_hosts_metric', 
        {precision:$scope.show.precision, metric:$scope.show.metric, hosts:$scope.show.hosts}, 
        function(res){
          $scope.show.hosts_metric=[];
          var d=res['data'];

          angular.forEach(d, function(v, k){
            v.metric = $scop.show.metric
            this.push( {host:v.host, chartOpt:make_chartOpt(v) }); // add one
          }, $scope.show.hosts_metric);
        }
      );
    }

    $scope.$watch(function(){return $scope.show.precision + $scope.show.metric;}, onSelect);
    //$scope.$watch(function(){return $scope.show.metric;}, onSelect);
 
    function onSelect2(){
      console.log('precision:' + $scope.show.precision);
      console.log('host:' + $scope.show.host);
      if(!$scope.show.precision || !$scope.show.host) return;
      $rootScope.myHttp('GET', '/monitorback/show_host_metrics', 
        {precision:$scope.show.precision, hosts:$scope.show.hosts}, 
        function(res){
          $scope.show.host_metrics=[];
          var d=res['data'];

          angular.forEach(d, function(v, k){
            this.push( {metric:v.metric, chartOpt:make_chartOpt(v) }); // add one
          }, $scope.show.host_metrics);
        }
      );
    }
	}

  function draw(target, host_metric){
    if($.isArray(target)) target=target[0]
    target = target.get();
    var myChart = echarts.init(target,{grid:{x:40,y:30,x2:10,y2:55}});
    myChart.setOption(host_metric.chartOpt); // ~ setOption
  }

  $scope.draw=function(host_metric){
    $timeout(function(){ draw($("#draw_"+host_metric.host), host_metric); }, 100);
  }

  $scope.showBig=function(host_metric){
		$("#bigDrawModal").modal();
    draw($("#draw_big"),host_metric);
  }

  $scope.init();

}]);

uhpApp.controller('MoniServiceCtrl', ['$scope', '$rootScope', '$http', '$sce','$timeout', function($scope, $rootScope, $http, $sce, $timeout){

}]);

uhpApp.controller('MoniJobCtrl', ['$scope', '$rootScope', '$http', '$sce','$timeout', function($scope, $rootScope, $http, $sce, $timeout){

}]);

uhpApp.controller('MoniConfCtrl', ['$scope', '$rootScope', '$http', '$sce','$timeout', function($scope, $rootScope, $http, $sce, $timeout){
  
  $scope.$watch(function(){return $rootScope.activedSubMenu.activeTab;}, function(newValue, oldValue){
    tabItem = newValue;
    if(tabItem.func) {
      try {
        eval(tabItem.func);
      } catch (err){
        $rootScope.alert("eval " + tabItem.func + " error:" + err.message);
      }
    }
  });

  $scope.query=function(is_refresh){
		if( $scope.sql==null || $scope.sql=="") return;
		$http({
	    method: 'POST',
	    url: '/adminback/manual_query',
	    params:  {
	    	"sql" : $scope.sql
    	}
	  }).success(function(response, status, headers, config){
	  	if(response["ret"]!="ok"){
	      	$rootScope.alert("提交失败 ("+response["msg"]+")");
          return;
	    }
      console.log("query ok!");
      is_refresh = !!is_refresh;
      if(!is_refresh){
        $scope.column = response['column']
      }
      if(is_refresh){
        $scope.copy_array(response['data'], $scope.data);
      }else{
			  $scope.data = response['data'];
      }
      console.log($scope.data);
	  }).error(function(data, status) {
	  	$rootScope.alert("发送manual_query请求失败");
	  });
	}

  function query_global_variate() {
    $scope.sql_table = "monitor_assist";
    $scope.sql = "select * from "+$scope.sql_table;
    $scope.query();
  }
  function query_monitor_metric() {
    $scope.sql_table = "monitor_metric";
    $scope.sql = "select * from "+$scope.sql_table;
    $scope.query();
  }
  function query_monitor_group() {
    $scope.sql_table = "monitor_group";
    $scope.sql = "select * from "+$scope.sql_table;
    $scope.query();
  }

  function query_monitor_host() {
    $scope.sql_table = "monitor_host";
    $scope.sql = "select * from "+$scope.sql_table;
    $scope.query();
  }
  
  function query_alarm() {
    $scope.sql_table = "alarm";
    $scope.sql = "select * from "+$scope.sql_table;
    $scope.query();
  }
  
  function query_alarm_assist() {
    $scope.sql_table = "alarm_assist";
    $scope.sql = "select * from "+$scope.sql_table;
    $scope.query();
  }

  $scope.add_table_record=function($event){
    $scope.is_adding_new_record = true;
  }
  $scope.giveup_record=function($event){
    $scope.is_adding_new_record = false;
    $scope.new_record = {};
  }


  function make_sql(method, table, values){
    var sql="";
    var opts = {autoQuoteFieldNames: true, autoQuoteTableNames: true};
    if(method == 'insert'){
      sql=squel.insert(opts).into(table).setFields(values).toString();
    } else if (method == "delete"){
      sql=squel.delete(opts).from(table).where("id="+values['id']).limit(1).toString();
    } else if (method == "update") {
      sql=squel.update(opts).table(table).setFields(values).where("id="+values['id']).limit(1).toString();
    }
    console.log(sql);
    return sql;
  }

  $scope.save_new_record=function($event){
    console.log($scope.new_record);
		if(!$scope.new_record) return;
    var sql = make_sql("insert", $scope.sql_table, $scope.new_record);
		$http({
	    method: 'POST',
	    url: '/adminback/manual_execute',
	    params:  { sql : sql }
	  }).success(function(response, status, headers, config){
	  	if(response["ret"]!="ok"){
	      	$rootScope.alert("提交失败 ("+response["msg"]+")");
          return;
	    }
      $scope.giveup_record();
      // 刷表格
      $scope.query(true);
	  }).error(function(data, status) {
	  	$rootScope.alert("发送manual_insert请求失败");
	  });
  }

  $scope.ready_edit_record=function(record){
    console.log(record);
    $scope.edit_record=$scope.copy_array(record);
    console.log($scope.edit_record);
  }

  $scope.giveup_edit_record=function(record){
    $scope.copy_array($scope.edit_record,record);
    $scope.edit_record=[];
  }

  $scope.copy_array=function(a,b){
    if(!b){ 
      var b = [];
    }else{
      b.splice(0, b.length)
    }
    for(i=0;i<a.length;i++){
      b.push(a[i]);
    }
    return b;
  }

  $scope.update_record=function(idx,record){
    console.log($scope.column);
    console.log(record);
    console.log($scope.edit_record);
    var update_record = {};
    for(i in $scope.column){
      update_record[$scope.column[i]] = record[i];
    }
    console.log(update_record);
    var sql = make_sql("update", $scope.sql_table, update_record);
		$http({
	    method: 'POST',
	    url: '/adminback/manual_execute',
	    params:  { sql : sql }
	  }).success(function(response, status, headers, config){
	  	if(response["ret"]!="ok"){
	      	$rootScope.alert("提交失败 ("+response["msg"]+")");
          return;
	    }
      $scope.edit_record = [];
      $scope.is_editing[idx] = false;
	  }).error(function(data, status) {
	  	$rootScope.alert("发送manual update请求失败");
	  });
  }
  $scope.delete_record=function(idx, record){
    var update_record = {};
    for(i in $scope.column){
      update_record[$scope.column[i]] = record[i];
    }
    console.log(update_record);
    var sql = make_sql("delete", $scope.sql_table, update_record);
		$http({
	    method: 'GET',
	    url: '/adminback/manual_execute',
	    params:  { sql : sql }
	  }).success(function(response, status, headers, config){
	  	if(response["ret"]!="ok"){
	      	$rootScope.alert("提交失败 ("+response["msg"]+")");
          return;
	    }
      $scope.data.splice(idx, 1);
      record=null;
	  }).error(function(data, status) {
	  	$rootScope.alert("发送manual delete请求失败");
	  });
  }

  $scope.new_record = {};
  $scope.edit_record = [];
  $scope.is_editing = [];

}]);
