(function($angular, $moment, _) {
    'use strict';

    $angular.module('app')
    .controller('mainController', ['$rootScope', '$scope', function($rootScope, $scope){

        $scope.cal = {
            prefix: 'swiper',
            show: false
        };

        $scope.showCalendar = function(date){
          $rootScope.$emit($scope.cal.prefix + ':show', date);
        };

        $scope.setDate = function(date){
          $rootScope.$emit($scope.cal.prefix + ':set', date);
        };

        $scope.hideCalendar = function(){
          $rootScope.$emit($scope.cal.prefix + ':hide');
        };

        var init = function(){
          $scope.date = null; //false; //'2015-10-31'; //new Date(); //$moment().valueOf(); //null; //$moment();
          $scope.showCalendar($scope.date);
        };

        init();

        $rootScope.$on($scope.cal.prefix + ':date', function(e, date){
            $scope.date = date;
        });

    }]);

})(window.angular, window.moment, window._);
