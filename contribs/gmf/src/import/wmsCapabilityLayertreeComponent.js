goog.provide('gmf.import.wmsCapabilityLayertreeComponent');

goog.require('gmf');
/** @suppress {extraRequire} */
goog.require('gmf.datasource.ExternalDatasourcesManager');
/** @suppress {extraRequire} */
goog.require('ngeo.message.Popup');
goog.require('ol');

gmf.import.wmsCapabilityLayertreeComponent = angular.module('gmfWmscapabilitylayertreenode', [
  gmf.datasource.ExternalDatasourcesManager.module.name,
  ngeo.message.Popup.module.name,
]);

gmf.module.requires.push(gmf.import.wmsCapabilityLayertreeComponent.name);


/**
 * @private
 */
gmf.import.wmsCapabilityLayertreeComponent.Controller_ = class {

  /**
   * @param {!gmf.datasource.ExternalDatasourcesManager}
   *     gmfExternalDatasourcesManager GMF service responsible of managing
   *     external data sources.
   * @private
   * @struct
   * @ngInject
   * @ngdoc controller
   * @ngname GmfWmscapabilitylayertreenodeController
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
     * WMS Capability Layer object.
     * @type {!Object}
     * @export
     */
    this.layer;

    /**
     * The original server url that was used to build the WMS GetCapabilities
     * request.
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
   * @param {!Object} layer WMS Capability Layer object
   * @export
   */
  createAndAddDataSource(layer) {
    this.gmfExternalDatasourcesManager_.createAndAddDataSourceFromWMSCapability(
      layer,
      this.capabilities,
      this.url
    );
  }

  /**
   * @param {!Object} layer WMS Capability Layer object
   * @return {number} Unique id for the Capability Layer.
   * @export
   */
  getUid(layer) {
    return ol.getUid(layer);
  }
};


gmf.import.wmsCapabilityLayertreeComponent.component('gmfWmscapabilitylayertreenode', {
  bindings: {
    'capabilities': '<',
    'layer': '<',
    'url': '<'
  },
  controller: gmf.import.wmsCapabilityLayertreeComponent.Controller_,
  templateUrl: () => `${gmf.baseModuleTemplateUrl}/import/wmsCapabilityLayertreeComponent.html`
});
