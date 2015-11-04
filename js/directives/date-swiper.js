(function($angular, $moment, _, Hammer){
  'use strict';

  $angular.module('app')

  .directive('tap', [function() {
    return function(scope, element, attr) {
      var hammerTap = new Hammer(element[0], {});
      hammerTap.on('tap', function() {
        scope.$apply(function() {
          scope.$eval(attr.tap);
        });
      });
    };
  }])

  .directive('dateSwiper', ['$rootScope', '$timeout', function($rootScope, $timeout) {
    var me = {};
    me.dFormat = 'YYYY-MM-DD';
    me.today = $moment().format(me.dFormat);

    me._buildDayObject = function(y,m,d){
      var _d = $moment([y, m, d]);
      return {
          num: _d.date(),
          date: _d.format(me.dFormat),
          weekday: _d.weekday(),
          month: m
      };
    };

    me._calendarData = function(date){
      var _key = $moment(date).startOf('month');
      // setup 'current' month days
      var d = [];
      d = _.times(_key.daysInMonth(), function(n){
        return me._buildDayObject(_key.year(), _key.month(), n+1);
      });
      // setup prev month backfill days
      var _p = $moment(_key).subtract(1, 'month');
      var _pd = [];
      var pd = [];
      var _pi = 0;
      var _pj = _p.daysInMonth();
      while (_pi < _key.isoWeekday()) {
        _pd.unshift(_pj);
        _pi++;
        _pj--;
      }
      pd = _.times(_pd.length, function(i){
        return me._buildDayObject(_p.year(), _p.month(), _pd[i]);
      });
      // setup next month postfill days
      var _n = $moment(_key).add(1, 'month');
      var _nsd = 1;
      var _t = 0;
      var _nd = [];
      var nd = [];
      _t = d.length + _pd.length;
      while (_t % 14 !== 0) {
        _nd.push(_nsd);
        _nsd++;
        _t++;
      }
      nd = _.times(_nd.length, function(i){
        return me._buildDayObject(_n.year(), _n.month(), _nd[i]);
      });

      return {
        days: pd.concat(d).concat(nd),
        year: _key.year(),
        month: _key.month(),
        monthName: _key.format('MMMM')
      };
    };

    // construct calendar data for 3 months: current/given month, previous, and next
    me._generateMonths = function(date){
      var m = [];
      date = $moment(date).isValid() ? $moment(date).valueOf() : $moment().valueOf();
      m.push(me._calendarData($moment(date).subtract(1, 'month')));
      m.push(me._calendarData($moment(date)));
      m.push(me._calendarData($moment(date).add(1, 'month')));
      return m;
    };

    me._tryFuzzyDates = function(date){
      if(date === 'today') {
        date = me.today;
      } else if(date === 'tomorrow') {
        date = $moment(me.today).add(1, 'day');
      } else if(date === 'yesterday') {
        date = $moment(me.today).subtract(1, 'day');
      }
      return date;
    };

    me._setActiveDate = function(date){
      date = me._tryFuzzyDates(date);
      return $moment(date).isValid() ? $moment(date).format(me.dFormat) : null;
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
            '<div class="month month-{{$index+1}} month-{{m.year}}-{{m.month+1}}" ng-repeat="m in months track by $index">' +
              '<div class="month-name">{{m.monthName}} <span class="month-year">{{m.year}}</span></div>' +
              '<ul class="day-names">' +
                '<li ng-repeat="n in dayNames track by $index" ng-class="{\'is-weekend\': $first || $last}">' +
                  '<div class="day-name">{{n}}</div>' +
                '</li>' +
              '</ul>' +
              '<ul class="days">' +
                '<li ng-repeat="d in m.days track by $index" tap="setDate(d.date)" ng-class="setClass(d, m)">' +
                  '<div class="date">{{d.num}}</div>' +
                '</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
          '<div class="toggle" tap="toggle()"></div>' +
        '</div>',

      link: function(scope, element) {
        var signature = scope.config.prefix || 'date-swiper';
        var swiper = $angular.element(element[0]);
        var carousel = $angular.element(element[0].querySelector('.carousel'));
        var hammerSwiper = new Hammer(swiper[0]);
        var d;
        var x = 0;
        var y = 0;
        var _snaps = [
          {key: 0, value: 0 },
          {key: 1, value: -100 },
          {key: 2, value: -200 }
        ];

        // get the snap location at 'panend' for where to animate the carousel
        var _calculateSnapPoint = function(pos) {
            var diff; // difference between pos and snap value
            var min; // smallest difference
            var key; // best snap key
            var value; // best snap value

            // loop to find smallest diff, it is closest to the pos
            _.times(3, function(n){
                var snap = n > 0 ? n * -100 : 0;
                diff = Math.abs(pos - snap);
                if (_.isUndefined(min) || diff < min) {
                    min = diff;
                    key = n;
                    value = snap;
                }
            });

            return {
                key: key,
                value: value
            };
        };

        var _setMonths = function(snap){
          var _c = scope.months[snap.key];
          carousel.removeClass('dragging').addClass('animate').css({transform: 'translate3d(' + snap.value + '%, 0, 0)'});
          // center active date, regenerate calendars
          if(snap.key !== 1) {
            $timeout(function(){
              scope.months = me._generateMonths($moment([_c.year, _c.month]).valueOf());
              scope.snap = _snaps[1];
              carousel.removeClass('animate').css({transform: 'translate3d(' + scope.snap.value + '%, 0, 0)'});
            }, 300);
          }
        };

        // STUFF ON SCOPE
        // user clicks date to make it "active"
        scope.setDate = function(date){
          scope.date = me._setActiveDate(date);
          scope.months = me._generateMonths(scope.date);
          _setMonths(scope.snap);
        };

        // Calculate the classes for the calendar items.
        scope.setClass = function(day, month){
          var classes = [];
          if(day.date === scope.date){ classes.push('is-selected'); }
          if(day.date === me.today){ classes.push('is-today'); }
          if(day.weekday === 0 || day.weekday === 6){ classes.push('is-weekend'); }
          if(day.month === month.month){ classes.push('day-in-curr-month'); }
          return classes.join(' ');
        };

        scope.toggle = function(){
          scope.config.show = !scope.config.show;
        };

        // HAMMER TIME
        hammerSwiper
        .get('pan')
        .set({direction: Hammer.DIRECTION_ALL, threshold: 0});

        hammerSwiper
        .on('panstart', function(){
          carousel.addClass('dragging').removeClass('animate');
          swiper.addClass('dragging');
        })
        .on('panleft panright panup pandown', function(e){
          d = Math.abs(parseInt(e.deltaX)) > Math.abs(parseInt(e.deltaY)) ? 'x' : 'y';
          x = scope.snap.value + ((parseInt(e.deltaX) / element[0].clientWidth) * 100 * scope.mod);
          y = ((parseInt(e.deltaY) / element[0].clientHeight) * 100 * scope.mod);
          y = y < 0 ? 0 : y;
          if(d === 'x'){
            carousel.css({transform: 'translate3d(' + x + '%, 0, 0)'});
          } else {
            swiper.css({transform: 'translate3d(0, ' + y + '%, 0)'});
          }
        })
        .on('panend', function(){
          swiper.removeClass('dragging').css({transform: ''});
          if(d === 'x'){
            scope.snap = _calculateSnapPoint(x);
            _setMonths(scope.snap);
          }
          if(d === 'y' && y > 35){
            scope.toggle();
          }
          scope.$apply();
        });

        // LISTEN FOR THINGS
        $rootScope.$on(signature + ':set', function(e, date){
          scope.setDate(date);
        });

        $rootScope.$on(signature + ':show', function(e, date){
          scope.config.show = true;
          scope.setDate(date);
        });

        $rootScope.$on(signature + ':hide', function(){
          scope.config.show = false;
        });

        // DO THINGS
        var init = function(date){
          scope.dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          scope.mod = parseFloat(scope.config.modifier) < 0.75 ? 0.75 : parseFloat(scope.config.modifier);
          scope.snap = _snaps[1];
          scope.setDate(date);
        };

        init(scope.date);
      }
    };

  }]);

})(window.angular, window.moment, window._, window.Hammer);
