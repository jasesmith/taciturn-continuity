(function($angular) {
    'use strict';

    $angular.module('app')
    .constant('system', {
        name: 'Date Swiper',
        prefix: 'swiper:',
        version: 0.1,
        dateFormat: 'ddd, MMM D',
        dayFormat: 'dd',
        timeFormat: 'h:mm a',
        colors: [
            {name: 'apple', color: '#fc1770'},
            {name: 'tangerine', color: '#ff7f36'},
            {name: 'banana', color: '#fff261'},
            {name: 'kermit', color: '#94ca3d'},
            {name: 'sky', color: '#15c5ec'},
            {name: 'berry', color: '#c657af'},
            {name: 'light', color: '#E3E9EC'},
            {name: 'dark', color: '#23292C'}
        ]
    })
    .config(function($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise('/');

        $stateProvider
        .state('main', {
            url: '/',
            templateUrl : 'views/main.html',
            controller  : 'mainController'
        });
    })
    .config(function($provide) {
        // to use: call $state.forceReload();
        $provide.decorator('$state', function($delegate, $stateParams) {
            $delegate.forceReload = function() {
                return $delegate.go($delegate.current, $stateParams, {
                    reload: true,
                    inherit: false,
                    notify: true
                });
            };
            return $delegate;
        });
    });

})(window.angular);
