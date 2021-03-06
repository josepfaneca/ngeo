goog.provide('ngeo.download.module');

goog.require('ngeo');
goog.require('ngeo.download.Csv');
goog.require('ngeo.download.service');

/**
 * @type {!angular.Module}
 */
ngeo.download.module = angular.module('ngeoDownloadModule', [
  ngeo.module.name, // Change me when all dependencies are in a module.
  ngeo.download.Csv.module.name,
  ngeo.download.service.name,
]);
