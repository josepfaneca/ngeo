goog.provide('app.grid');

// webpack: import './grid.css';
// webpack: import './common_dependencies.js';
goog.require('ngeo');
goog.require('ngeo.grid.module');


/** @type {!angular.Module} **/
app.grid.module = angular.module('app', [
  ngeo.module.name,
  ngeo.grid.module.name
]);


/**
 * @constructor
 * @ngInject
 */
app.grid.MainController = function() {

  const data = [
    {
      'name': 'row_1',
      'display_name': 'Row 1',
      'type': 12,
      'timestamp': '2010-11-09T22:56:26Z'
    },
    {
      'name': 'row_2',
      'display_name': 'Row 2',
      'type': 121,
      'timestamp': '2010-11-07T22:56:26Z'
    },
    {
      'name': 'row_3',
      'display_name': 'Row 3',
      'type': 7,
      'timestamp': '2010-11-03T22:56:26Z'
    },
    {
      'name': 'row_4',
      'display_name': 'Row 4',
      'type': 5,
      'timestamp': '2010-11-19T22:56:26Z'
    },
    {
      'name': 'row_5',
      'display_name': 'Row 5',
      'type': 23,
      'timestamp': '2010-11-23T22:56:26Z'
    },
    {
      'name': 'row_6',
      'display_name': 'Row 6',
      'type': 111,
      'timestamp': '2010-11-17T22:56:26Z'
    }
  ];

  const columnDefs = [
    {name: 'name'},
    {name: 'display_name'},
    {name: 'timestamp'},
    {name: 'type'}
  ];

  /**
   * @type {ngeo.grid.Config}
   * @export
   */
  this.gridConfig = new ngeo.grid.Config(data, columnDefs);

};


app.grid.module.controller('MainController', app.grid.MainController);
