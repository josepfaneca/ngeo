goog.provide('gmf.import.wmtsCapabilityLayertreeComponent');

goog.require('gmf');
/** @suppress {extraRequire} */
goog.require('gmf.datasource.ExternalDatasourcesManager');
/** @suppress {extraRequire} */
goog.require('ngeo.message.Popup');
goog.require('ol');


gmf.import.wmtsCapabilityLayertreeComponent = angular.module('gmfWmtscapabilitylayertree', [
  gmf.datasource.ExternalDatasourcesManager.module.name,
  ngeo.message.Popup.module.name,
]);

gmf.module.requires.push(gmf.import.wmtsCapabilityLayertreeComponent.name);


/**
 * @private
 */
gmf.import.wmtsCapabilityLayertreeComponent.Controller_ = class {

  /**
   * @param {!gmf.datasource.ExternalDatasourcesManager}
   *     gmfExternalDatasourcesManager GMF service responsible of managing
   *     external data sources.
   * @private
   * @struct
   * @ngInject
   * @ngdoc controller
   * @ngname GmfWmtscapabilitylayertreeController
   */
  constructor(gmfExternalDatasourcesManager) {

    // Binding properties

    /**
     * WMS Capabilities definition
     * @type {!Object}
     * @export
     */
    this.capabilities;

    /**
     * List of WMTS Capability Layer objects.
     * @type {!Array.<!Object>}
     * @export
     */
    this.layers;

    /**
     * The original WMTS GetCapabilities url that was used to fetch the
     * capability layers.
     * @type {string}
     * @export
     */
    this.url;


    // Injected properties

    /**
     * @type {!gmf.datasource.ExternalDatasourcesManager}
     * @private
     */
    this.gmfExternalDatasourcesManager_ = gmfExternalDatasourcesManager;
  }

  /**
   * @param {!Object} layer WMTS Capability Layer object
   * @export
   */
  createAndAddDataSource(layer) {
    const manager = this.gmfExternalDatasourcesManager_;
    manager.createAndAddDataSourceFromWMTSCapability(
      layer,
      this.capabilities,
      this.url
    );
  }

  /**
   * @param {!Object} layer WMTS Capability Layer object
   * @return {number} Unique id for the Capability Layer.
   * @export
   */
  getUid(layer) {
    return ol.getUid(layer);
  }
};


gmf.import.wmtsCapabilityLayertreeComponent.component('gmfWmtscapabilitylayertree', {
  bindings: {
    'capabilities': '<',
    'layers': '<',
    'url': '<'
  },
  controller: gmf.import.wmtsCapabilityLayertreeComponent.Controller_,
  templateUrl: () => `${gmf.baseModuleTemplateUrl}/import/wmtsCapabilityLayertreeComponent.html`
});
