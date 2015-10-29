(function($angular, $moment, _) {
    'use strict';

    $angular.module('app')
    .controller('mainController', ['$rootScope', '$scope', 'system', 'UtilityService', function($rootScope, $scope, system, utils){

        $scope.calendarConfig = {
            prefix: system.prefix,
            show: true,
            // seeds: 3,
            // start: '2015-10-31',// $moment(), //.valueOf(), // unix offset in milliseconds
            // end: false
        };

        var init = function(){
          $scope.date = null; //$moment();
          $rootScope.$emit(system.prefix + 'set-date', $scope.date);
        };

        init();

        $scope.showCalendar = function(){
          $scope.calendarConfig.show = true;
        };

        $rootScope.$on(system.prefix + 'date', function(e, date){
            $scope.date = date;
            // $scope.calendarConfig.start = date;
        });

    }]);

})(window.angular, window.moment, window._);
