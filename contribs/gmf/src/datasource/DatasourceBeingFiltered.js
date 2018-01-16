goog.provide('gmf.datasource.DatasourceBeingFiltered');

goog.require('gmf');


/**
 * @type {!angular.Module}
 */
gmf.datasource.DatasourceBeingFiltered.module = angular.module('gmfDatasourceBeingFiltered', []);
// type gmfx.datasource.DatasourceBeingFiltered
gmf.datasource.DatasourceBeingFiltered.module.value('gmfDatasourceBeingFiltered', {
  dataSource: null
});
gmf.module.requires.push(gmf.datasource.DatasourceBeingFiltered.module.name);
