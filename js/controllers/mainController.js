(function($angular, $moment, _) {
    'use strict';

    $angular.module('app')
    .controller('mainController', ['$rootScope', '$scope', function($rootScope, $scope){

        $scope.config = {
            prefix: 'swiper',
            modifier: 1.5,
            show: true
        };

        $scope.showCalendar = function(date){
          $rootScope.$emit($scope.config.prefix + ':show', date);
        };

        $scope.setDate = function(date){
          $rootScope.$emit($scope.config.prefix + ':set', date);
        };

        $scope.hideCalendar = function(){
          $rootScope.$emit($scope.config.prefix + ':hide');
        };

        var init = function(){
          $scope.date = 'today'; //'2015-10-31'; //new Date(); //$moment().valueOf(); //null; //$moment();
          $scope.showCalendar($scope.date);
        };

        init();

        $rootScope.$on($scope.config.prefix + ':date', function(e, date){
            $scope.date = date;
        });

    }]);

})(window.angular, window.moment, window._);
