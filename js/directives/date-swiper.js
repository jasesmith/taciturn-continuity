(function($angular, $moment, _, Hammer){
  'use strict';

  $angular.module('app')
  .directive('dateSwiper', ['$rootScope', '$timeout', function($rootScope, $timeout) {

    var dFormat = 'YYYY-MM-DD';

    var _buildDayObject = function(y,m,d){
      var _d = $moment([y, m, d]);
      return {
          num: _d.date(),
          date: _d.format(dFormat),
          weekday: _d.weekday()
      };
    };

    var _calendarData = function(date){
      var _key = $moment(date).startOf('month');
      // window.console.log('\ncal data:', _key._d);
      // setup 'current' month days
      var _y = _key.year();
      var _m = _key.month();
      var n = _key.format('MMMM');
      var d = [];
      // setup prev month backfill days
      var _p = $moment(_key).subtract(1, 'month'); //.month();
      var _psd = _key.isoWeekday();
      var _pd = [];
      var pd = [];
      var _pi = 0;
      var _pj = _p.daysInMonth();
      // setup next month postfill days
      var _n = $moment(_key).add(1, 'month'); //.month();
      var _nsd = 1;
      var _t = 0;
      var _nd = [];
      var nd = [];

      // current month days
      d = _.times(_key.daysInMonth(), function(n){
        return _buildDayObject(_y, _m, n+1);
      });

      // prev month backfill days
      while (_pi < _psd) {
        _pd.unshift(_pj);
        _pi++;
        _pj--;
      }
      pd = _.times(_pd.length, function(i){
        return _buildDayObject(_p.year(), _p.month(), _pd[i]);
      });

      // next month postfill days
      _t = d.length + _pd.length;
      while (_t % 14 !== 0) {
        _nd.push(_nsd);
        _nsd++;
        _t++;
      }
      nd = _.times(_nd.length, function(i){
        return _buildDayObject(_n.year(), _n.month(), _nd[i]);
      });

      return {
        currDays: d,
        currYear: _y,
        currMonth: (_m+1),
        currMonthName: n,
        prevDays: pd,
        nextDays: nd
      };
    };

    // get the snap location at 'panend' for where to animate the calendar
    var _calculateSnapPoint = function(position) {
        var currDiff; // store each difference between the current position and each snap value
        var minDiff; // store the smallest difference
        var snapKey; // store the best snap key
        var snapValue; // store the best snap value

        // loop to find which snap point (value) is closest to the given position
        _.times(3, function(n){
            var snap = n > 0 ? n * -100 : 0;
            currDiff = Math.abs(position - snap);
            if (_.isUndefined(minDiff) || currDiff < minDiff) {
                minDiff = currDiff;
                snapKey = n;
                snapValue = snap;
            }
        });

        return {
            key: snapKey,
            value: snapValue
        };
    };

    // construct calendar data for 3 months: current (date) month, previous, and next
    var _generateMonths = function(date){
      var m = [];
      date = $moment(date).isValid() ? $moment(date).valueOf() : $moment().valueOf();
      m.push(_calendarData($moment(date).subtract(1, 'month')));
      m.push(_calendarData($moment(date)));
      m.push(_calendarData($moment(date).add(1, 'month')));
      return m;
    };

    return {
      restrict: 'E',
      replace: true,

      scope: {
        config: '=?',
        date: '=?'
      },

      template: '' +
        '<div class="date-swiper" ng-class="{\'is-active\': config.show}">' +
          '<div class="carousel">' +

            '<div class="month month-{{$index+1}} month-{{m.currYear}}-{{m.currMonth}}" ng-repeat="m in months">' +
              '<div class="month-name">{{m.currMonthName}} <span class="month-year">{{m.currYear}}</span></div>' +
              '<div class="days">' +

                '<ul class="day-names">' +
                    '<li ng-repeat="l in dayLabels track by $index" ng-class="{\'is-weekend\': $first || $last}">' +
                      '<span class="day-name">{{l}}</span>' +
                    '</li>' +
                '</ul>' +

                '<ul class="month-days">' +
                    '<li ng-repeat="d in m.prevDays" class="day-in-prev-month" data-date="{{d.date}}" ng-class="setClass(d)">' +
                      '<div class="date" title="{{d.date}}">{{d.num}}</div>' +
                    '</li>' +
                    '<li ng-repeat="d in m.currDays" class="day-in-curr-month" data-date="{{d.date}}" ng-class="setClass(d)">' +
                      '<div class="date" title="{{d.date}}">{{d.num}}</div>' +
                    '</li>' +
                    '<li ng-repeat="d in m.nextDays" class="day-in-next-month" data-date="{{d.date}}" ng-class="setClass(d)">' +
                      '<div class="date" title="{{d.date}}">{{d.num}}</div>' +
                    '</li>' +
                '</ul>' +

              '</div>' +
            '</div>' +

          '</div>' +
          '<div class="toggle"></div>' +
        '</div>' +
      '',

      link: function(scope, element) {
        var days = [];
        var hammerDays = [];
        var xPos = 0;
        var dir;
        var prevSnapKey = 1;
        var today = $moment().format(dFormat);
        var swiper = $angular.element(element[0]);
        var carousel = $angular.element(element[0].querySelector('.carousel'));
        var toggle = $angular.element(element[0].querySelector('.toggle'));
        var signature = scope.config.prefix || 'date-swiper';
        var _snaps = [
          {key: 0, value: 0 },
          {key: 1, value: -100 },
          {key: 2, value: -200 }
        ];

        // STUFF ON SCOPE
        // ---------------------------------------------------------------------

        var _tryFuzzyDates = function(date){
          if(date === 'today') {
            date = today;
          }
          if(date === 'tomorrow') {
            date = $moment(today).add(1, 'day');
          }
          if(date === 'yesterday') {
            date = $moment(today).subtract(1, 'day');
          }
          return date;
        };

        // When a user clicks on the date make it "active"
        var setActiveDate = function(date) {
          scope.date = $moment(date).isValid() ? $moment(date).format(dFormat) : _tryFuzzyDates(date);
          $rootScope.$emit(signature + ':date', scope.date);
        };

        var _bindHammerDays = function(){
          days = $angular.element(element[0].querySelectorAll('.month-days li'));
          _.each(days, function(day, i){
            // window.console.log('binding', i);
            hammerDays[i] = new Hammer(day, {});
            hammerDays[i].on('tap', function(e) {
              // window.console.log('TAP:', e.target.dataset.date);
              setActiveDate(e.target.dataset.date);
              scope.$apply();
            });
          });
        };

        var _unbindHammerDays = function(){
          days = $angular.element(element[0].querySelectorAll('.month-days li'));
          _.each(days, function(day, i){
            // window.console.log('unbinding', i);
            hammerDays[i].destroy();
          });
          scope.$apply();
        };

        var init = function() {
          scope.bound = [];
          scope.dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          scope.months = _generateMonths(scope.date);
          scope.snap = _snaps[1];

          carousel.addClass('animate').css({transform: 'translate3d(' + scope.snap.value + 'vw, 0, 0)'});

          $timeout(function(){
            _bindHammerDays();
          }, 10);
        };

        // Calculate the classes for the calendar items.
        scope.setClass = function(day) {
          var classes = [];
          if (day.date === scope.date) {
            classes.push('is-selected');
          }
          if (day.date === today) {
            classes.push('is-today');
          }
          if(day.weekday === 0 || day.weekday === 6) {
            classes.push('is-weekend');
          }
          return classes.join(' ');
        };

        // HAMMER TIME
        // ---------------------------------------------------------------------
        var hammerToggle = new Hammer(toggle[0], {});
        var hammerSwiper = new Hammer(swiper[0], {threshold: 0});

        hammerToggle.on('tap', function() {
          scope.config.show = !scope.config.show;
          scope.$apply();
        });

        hammerSwiper.on('panstart', function(){
          window.console.log('start', scope.snap.key);
          carousel.removeClass('animate');
          scope.$apply();
        });

        hammerSwiper.on('panleft panright', function(e) {
          xPos = scope.snap.value + (((parseInt(e.deltaX) / element[0].clientWidth) * 100));
          carousel.css({transform: 'translate3d(' + xPos + 'vw, 0, 0)'});
          dir = e.type;
          scope.$apply();
        });











        hammerSwiper.on('panend', function() {
          prevSnapKey = scope.snap.key;

          scope.snap = _calculateSnapPoint(xPos);
          var _c = scope.months[scope.snap.key];

          carousel.addClass('animate').css({transform: 'translate3d(' + scope.snap.value + 'vw, 0, 0)'});

          // unbind taps, regenerate calendars, and rebind taps
          if(prevSnapKey !== scope.snap.key && scope.snap.key !== 1) {
            $timeout(function(){
                _unbindHammerDays();
                scope.months = _generateMonths($moment([_c.currYear, _c.currMonth-1]).valueOf());
            }, 35);
            $timeout(function(){
              scope.snap = _snaps[1];
              carousel.removeClass('animate').css({transform: 'translate3d(' + scope.snap.value + 'vw, 0, 0)'});
              _bindHammerDays();
            }, 65);
          }

          scope.$apply();
        });











        // LISTEN FOR THINGS
        // ---------------------------------------------------------------------
        $rootScope.$on(signature + ':set', function(e, date){
          window.console.log('SET DATE', date);
          setActiveDate(date);
        });

        $rootScope.$on(signature + ':show', function(e, date){
          window.console.log('SHOW', date);
          setActiveDate(date);
          scope.config.show = true;
        });

        $rootScope.$on(signature + ':hide', function(){
          scope.config.show = false;
        });

        // WATCH THINGS
        // ---------------------------------------------------------------------
        // scope.$watch('config', function(value){
        //   return value;
        // });

        scope.$watch('date', function(value){
          if(value) {
            window.console.log('watch:', value);
            scope.date = $moment(value).isValid() ? $moment(value).format(dFormat) : value;
          }
        });

        init();

      }
    };

  }]);

})(window.angular, window.moment, window._, window.Hammer);
