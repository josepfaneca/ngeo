goog.provide('gmf.datasource.module');

goog.require('gmf.datasource.DatasourceBeingFiltered');
goog.require('gmf.datasource.ExternalDatasourcesManager');
goog.require('gmf.datasource.Helper');
goog.require('gmf.datasource.Manager');


/**
 * @type {!angular.Module}
 */
gmf.datasource.module = angular.module('gmfDatasourceModule', [
  gmf.datasource.DatasourceBeingFiltered.module.name,
  gmf.datasource.ExternalDatasourcesManager.module.name,
  gmf.datasource.Helper.module.name,
  gmf.datasource.Manager.module.name,
]);
