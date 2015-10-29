(function($angular, $moment, Hammer){
  'use strict';

  $angular.module('app')
    .directive('calendar', ['$rootScope', 'UiService', function($rootScope, ui) {

          var _calendarData = function(datetime){
            var _d = $moment(datetime).startOf('month'); //new Date(yr, mo, 0);
            var _y = _d.year();
            var _m = _d.month();
            var name = _d.format('MMMM');
            var days = _.times(_d.daysInMonth(), function(n){
                n = n+1;
                var dayObject = $moment([_y, _m, n]);
                return {
                    num: n,
                    date: dayObject.format('YYYY-MM-DD'),
                    weekday: dayObject.weekday()
                };
            });

            // Prefill.
            var _startIndex = _d.isoWeekday();
            var _daysInPrevMonth = $moment(datetime).subtract(1, 'month').daysInMonth();
            var prevMonthDays = []; // Store the prev month dates in an array.

            if (_startIndex > 0) {
                // whittle down previous month days to fit in current month calendar
                var i = 0; // Used to count how many days until the current month starts.
                var _lastMonthDate = _daysInPrevMonth; // Used to count down from the last day of the month backwards.
                while (i < _startIndex) {
                    prevMonthDays.unshift(_lastMonthDate);
                    i++;
                    _lastMonthDate--;
                }
            }

            // Postfill.
            var _nextMonthDate = 1; // always starts at 1 (the first of the month)
            var nextMonthDays = [];

            var _totalSize = days.length + nextMonthDays.length + prevMonthDays.length;

            // window.console.log(name, _totalSize);

            while (_totalSize % 14 !== 0) {
                nextMonthDays.push(_nextMonthDate);
                _nextMonthDate++;
                _totalSize++;
            }

            return {
                days: days,
                name: name,
                year: _y,
                month: (_m+1),
                prevMonthDays: prevMonthDays,
                nextMonthDays: nextMonthDays
            };
          };

          return {

              restrict: 'E',
              replace: true,
              scope: {
                  config: '='
              },

              controller: function($scope){
                  // get months
                  $scope.months = _.times($scope.config.seeds, function(n){
                      return _calendarData($moment($scope.config.start).add(n, 'months'));
                  });

                  //debugging
                  // $scope.showCalendar = true;

                  $rootScope.$on('calendar:show', function(ev, date){
                      var _m = $moment(date).month();
                      var _index = _.findIndex($scope.months, function(month){
                          return month.month === (_m+1);
                      });
                      $scope.showCalendar = true;
                      // window.console.log('set-key', _index);
                      $scope.activeDate = $moment(date).format('YYYY-MM-DD');
                      $scope.$emit($scope.config.prefix + 'set-key', _index);
                  });

                  // $rootScope.$on('minder:set-date', function(ev, value){
                  // });

                  // $rootScope.$on('calendar:changed', function(ev, snap){
                  //     // window.console.log('snap', snap);
                  // });
              },

              // TODO: CALENDAR - need controller to consume swipe-end event?

              template:
                  '<div class="calendar-wrap" ng-class="{\'active\': showCalendar}">' +
                      '<div class="close-view calendar-toggle fg-active" hm-tap="hideCalendar($event)"></div>' +

                      '<div class="carousel-wrap" swipe-and-snap snaps="config.seeds">' +

                          '<div class="slide month" ng-repeat="month in months track by $index">' +
                              '<div class="month-name">{{month.name}} <span class="shadow">{{month.year}}</span></div>' +
                              '<div class="days">' +
                                  '<ul class="day-names">' +
                                      '<li ng-repeat="dayLabel in dayLabels track by $index" ng-class="{\'weekend\': $first || $last}">{{dayLabel}}</li>' +
                                  '</ul>' +
                                  '<ul>' +
                                      '<li ng-repeat="day in month.prevMonthDays">' +
                                          '<div class="date disabled ghost">{{day}}</div>' +
                                      '</li>' +
                                      '<li ng-repeat="day in month.days" title="{{day.date}}" hm-tap="setActiveDate($event, day.date)">' +
                                          '<div class="date" ng-class="setClass(day)" title="{{day.date}}">{{day.num}}</div>' +
                                      '</li>' +
                                      '<li ng-repeat="day in month.nextMonthDays">' +
                                          '<div class="date disabled ghost">{{day}}</div>' +
                                      '</li>' +
                                  '</ul>' +
                              '</div>' +
                          '</div>' +

                      '</div>' +

                  '</div>',

              link: function(scope, element, attr) {

                  var today = $moment().format('YYYY-MM-DD'); //new Date().getDate();

                  scope.dayLabels = _dayLabels;

                  scope.hideCalendar = function(event){
                      ui.eventHijack(event);
                      scope.showCalendar = false;
                  };

                  // When a user clicks on the date make it "active".
                  scope.setActiveDate = function(event, date) {
                      ui.eventHijack(event);
                      scope.activeDate = $moment(date).format('YYYY-MM-DD');
                      // window.console.log(scope.config.prefix + 'date', date, scope.activeDate);
                      scope.$emit(scope.config.prefix + 'date', scope.activeDate);
                  };

                  // Calculate the classes for the calendar items.
                  scope.setClass = function(day) {
                      var classes = [];

                      if (day.date === scope.activeDate) {
                          classes.push('active');
                      }
                      if (day.date === today) {
                          classes.push('today');
                      }
                      if(day.weekday === 0 || day.weekday === 6) {
                          classes.push('weekend');
                      }

                      return classes.join(' ');
                  };

              }
          };
    }])

      // The swipeAndSnap directive.
    .directive('swipeAndSnap', ['$rootScope', function($rootScope) {

          // Calculate the snap location.
          // Called on drag end to work out where to animate the div to.
          var _calculateSnapPoint = function(snaps, position) {
              var currentDiff; // Used to store each difference between current position and each snap point.
              var minimumDiff; // Used to store the current best difference.
              var bestSnap; // Used to store the best snap position.
              var bestKey; // Used to store the best snap key.

              // We're going to cycle through each snap location
              // and work out which is closest to the current position.
              _.each(snaps, function(snap, i){
                  // Calculate the difference.
                  currentDiff = Math.abs(position - snap);

                  // Works out if this difference is the closest yet.
                  if (minimumDiff === undefined || currentDiff < minimumDiff) {
                      minimumDiff = currentDiff;
                      bestSnap = snap;
                      bestKey = i;
                  }
              });

              return {
                  key: bestKey,
                  value: bestSnap
              };
          };

          return {

              // Bind to snapLocations, an array of snap points
              // the div will revert to when the drag ends.
              scope: {
                  snaps: '='
              },

              controller: function($scope){
                  $rootScope.$on('minder:set-key', function(ev, index) {
                      // window.console.log('wtf', $scope.snapGrid[index]);
                      $scope.element.css({transform: 'translate3d(' + $scope.snapGrid[index] + 'vw, 0, 0)'});
                      $scope.activeKey = index;
                  });
              },

              link: function(scope, element, attr) {

                  scope.element = element;
                  scope.activeLocation = 0; // Define the location to end.
                  scope.activeKey = 0; // Used to lookup if my location is active.
                  var positionX = 0; // The current position.

                  scope.snapGrid = _.times(scope.snaps, function(n){
                      return -n*100;
                  });

                  // Perform any setup for the drag actions.
                  var el = new Hammer(element[0]);

                  // We dont want an animation delay when dragging.
                  el.on('panstart', function(ev) {
                      element.removeClass('animate');
                  });

                  // Follow the drag position when the user is interacting.
                  el.on('pan', function(ev) {
                      // Set the current position.
                      positionX = scope.activeLocation + (((parseInt(ev.deltaX) / document.body.clientWidth) * 100));

                      element.css({transform: 'translate3d(' + positionX + 'vw, 0, 0)'});
                  });

                  // The drag is finishing so we'll animate to a snap point.
                  el.on('panend', function(ev) {
                      element.addClass('animate');

                      // Work out where we should "snap" to.
                      var snap = _calculateSnapPoint(scope.snapGrid, positionX);
                      scope.activeLocation = snap.value;

                      element.css({transform: 'translate3d(' + scope.activeLocation + 'vw, 0, 0)'});

                      scope.activeKey = snap.key;
                      scope.$apply();

                      // TODO: CALENDAR - emit swipe-end event
                      scope.$emit('calendar:changed', snap);
                  });

              }
          };
    }]);
})(window.angular, window.moment, window.Hammer);
