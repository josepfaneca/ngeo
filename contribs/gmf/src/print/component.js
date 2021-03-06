goog.provide('gmf.print.component');

goog.require('gmf');
/** @suppress {extraRequire} */
goog.require('gmf.authentication.Service');
goog.require('gmf.theme.Themes');
goog.require('goog.asserts');
goog.require('ngeo.map.LayerHelper');
goog.require('ngeo.map.FeatureOverlayMgr');
goog.require('ngeo.misc.FeatureHelper');
goog.require('ngeo.print.Service');
goog.require('ngeo.print.Utils');
goog.require('ngeo.query.MapQuerent');
goog.require('ol.array');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Group');
goog.require('ol.Observable');
goog.require('ol.Map');
goog.require('ol.math');


/**
 * @type {!angular.Module}
 */
gmf.print.component = angular.module('gmfPrintComponent', [
  gmf.authentication.Service.module.name,
  gmf.theme.Themes.module.name,
  ngeo.map.LayerHelper.module.name,
  ngeo.map.FeatureOverlayMgr.module.name,
  ngeo.misc.FeatureHelper.module.name,
  ngeo.print.Service.module.name,
  ngeo.print.Utils.module.name,
  ngeo.query.MapQuerent.module.name,
]);

gmf.module.requires.push(gmf.print.component.name);


/**
 * @enum {string}
 * @export
 */
gmf.print.component.PrintStateEnum = {

  /**
   * @type {string}
   * @export
   */
  NOT_IN_USE: 'notInUse',

  /**
   * @type {string}
   * @export
   */
  PRINTING: 'printing',

  /**
   * @type {string}
   * @export
   */
  ERROR_ON_REPORT: 'errorOnReport',

  /**
   * @type {string}
   * @export
   */
  CAPABILITIES_NOT_LOADED: 'capabilitiesNotLoaded',

  /**
   * @type {string}
   * @export
   */
  ERROR_ON_GETCAPABILITIES: 'errorOnGetCapabilities'
};


gmf.print.component.value('gmfPrintState', {
  'state': gmf.print.component.PrintStateEnum.CAPABILITIES_NOT_LOADED
});


gmf.print.component.value('gmfPrintTemplateUrl',
  /**
     * @param {angular.JQLite} element Element.
     * @param {angular.Attributes} attrs Attributes.
     * @return {string} Template.
     */
  (element, attrs) => {
    const templateUrl = attrs['gmfPrintTemplateurl'];
    return templateUrl !== undefined ? templateUrl :
      `${gmf.baseModuleTemplateUrl}/print/component.html`;
  });


/**
 * @param {!angular.JQLite} $element Element.
 * @param {!angular.Attributes} $attrs Attributes.
 * @param {!function(!angular.JQLite, !angular.Attributes): string} gmfPrintTemplateUrl Template function.
 * @return {string} Template URL.
 * @ngInject
 */
function gmfPrintTemplateUrl($element, $attrs, gmfPrintTemplateUrl) {
  return gmfPrintTemplateUrl($element, $attrs);
}


/**
 * Provide a component that display a print panel. This panel is populated with
 * a form corresponding to the capabilities delivered by a GMF print v3 server.
 * If you want to use another template for your print panel, you can see the
 * available layout information in the 'gmfx.PrintLayoutInfo' classes.
 *
 * Simple example:
 *
 *      <gmf-print
 *        gmf-print-map="::mainCtrl.map"
 *        gmf-print-active="printActive"
 *        gmf-print-rotatemask="::true">
 *      </gmf-print>
 *
 * Example with user defined attribute:
 *
 *      <gmf-print
 *        gmf-print-map="::mainCtrl.map"
 *        gmf-print-active="printActive"
 *        gmf-print-rotatemask="::true"
 *        gmf-print-hiddenattributes="::['name']"
 *        gmf-print-attributes-out="::attributes">
 *        <div ng-repeat="attribute in ::attributes">
 *          <div ng-if="attribute.name == 'name'">
 *            <input ng-model="attribute.value" placeholder="name" />
 *          </div>
 *        </div>
 *      </gmf-print>
 *
 * Note: The 'print' and 'cancel' functions can also be called via globals
 * events 'gmfStartPrint' and 'gmfCancelPrint'.
 *
 * @htmlAttribute {ol.Map} gmf-print-map The map.
 * @htmlAttribute {boolean} gmf-print-active A boolean that informs if the
 *     panel is open or not.
 * @htmlAttribute {boolean} gmf-print-rotatemask Optional. True to apply
 *     rotation on the mask instead of the map. By default, the map rotates.
 * @htmlAttribute {Object.<string, string|number|boolean>}
 *     gmf-print-fieldvalues optional. Key, value object to define default
 *     value in each of your print panel field. The key refers to the
 *     property's name of the field.
 *     Example: {'comments': 'demo', 'legend': false}. Doesn't work for the dpi
 *     and the scale. Server's values are used in priorty.
 * @htmlAttribute {Array.<string>} gmf-print-hiddenattributes The list of attributes that should be hidden.
 * @ngdoc component
 * @ngname gmfPrint
 */
gmf.print.component.component_ = {
  bindings: {
    'map': '<gmfPrintMap',
    'active': '=gmfPrintActive',
    'rotateMask': '<?gmfPrintRotatemask',
    'fieldValues': '<?gmfPrintFieldvalues',
    'hiddenAttributeNames': '<?gmfPrintHiddenattributes',
    'attributesOut': '=?gmfPrintAttributesOut'
  },
  controller: 'GmfPrintController',
  templateUrl: gmfPrintTemplateUrl,
  transclude: true
};


gmf.print.component.component('gmfPrint', gmf.print.component.component_);


/**
 * @private
 */
gmf.print.component.Controller_ = class {

  /**
   * @param {angular.Scope} $rootScope Angular root scope.
   * @param {angular.Scope} $scope Angular scope.
   * @param {angular.$timeout} $timeout Angular timeout service.
   * @param {angular.$q} $q The Angular $q service.
   * @param {angular.$injector} $injector Main injector.
   * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
   * @param {ngeo.map.LayerHelper} ngeoLayerHelper The ngeo Layer Helper service.
   * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Ngeo Feature Overlay
   *     Manager service.
   * @param {ngeo.print.Utils} ngeoPrintUtils The ngeo PrintUtils service.
   * @param {ngeox.CreatePrint} ngeoCreatePrint The ngeo Create Print function.
   * @param {string} gmfPrintUrl A MapFishPrint url.
   * @param {gmf.authentication.Service} gmfAuthenticationService The authentication service.
   * @param {ngeox.QueryResult} ngeoQueryResult ngeo query result.
   * @param {angular.$filter} $filter Angular $filter service.
   * @param {gmf.print.component.PrintStateEnum} gmfPrintState GMF print state.
   * @param {gmf.theme.Themes} gmfThemes The gmf Themes service.
   * @private
   * @ngInject
   * @ngdoc controller
   * @ngname GmfPrintController
   */
  constructor($rootScope, $scope, $timeout, $q, $injector,
    gettextCatalog, ngeoLayerHelper, ngeoFeatureOverlayMgr,  ngeoPrintUtils,
    ngeoCreatePrint, gmfPrintUrl, gmfAuthenticationService, ngeoQueryResult,
    $filter, gmfPrintState, gmfThemes) {

    /**
     * @type {gmf.print.component.PrintStateEnum}
     * @private
     */
    this.gmfPrintState_ = gmfPrintState;

    /**
     * @type {function(string): string}
     * @private
     */
    this.translate_ = $filter('translate');

    /**
     * @type {ol.Map}
     * @export
     */
    this.map;

    /**
     * @type {boolean}
     * @export
     */
    this.active;

    /**
     * @type {boolean}
     * @export
     */
    this.rotateMask = false;

    /**
     * @type {Object.<string, string|number|boolean>!}
     * @export
     */
    this.fieldValues = {};

    /**
     * @type {Array.<string>}
     * @export
     */
    this.attributesOut;

    /**
     * @type {angular.Scope}
     * @private
     */
    this.$rootScope_ = $rootScope;

    /**
     * @type {angular.Scope}
     * @private
     */
    this.$scope_ = $scope;

    /**
     * @type {angular.$timeout}
     * @private
     */
    this.$timeout_ = $timeout;

    /**
     * @type {angular.$q}
     * @private
     */
    this.$q_ = $q;

    /**
     * @type {angularGettext.Catalog}
     * @private
     */
    this.gettextCatalog_ = gettextCatalog;

    /**
     * @type {ngeo.map.LayerHelper}
     * @private
     */
    this.ngeoLayerHelper_ = ngeoLayerHelper;

    /**
     * @type {ol.layer.Vector}
     * @private
     */
    this.featureOverlayLayer_ = ngeoFeatureOverlayMgr.getLayer();

    /**
     * @type {ngeo.print.Utils}
     * @private
     */
    this.ngeoPrintUtils_ = ngeoPrintUtils;

    /**
     * @type {ngeo.print.Service}
     * @private
     */
    this.ngeoPrint_ = ngeoCreatePrint(gmfPrintUrl);

    /**
     * @type {ngeox.QueryResult}
     * @private
     */
    this.ngeoQueryResult_ = ngeoQueryResult;

    /**
     * @type {gmf.authentication.Service}
     * @private
     */
    this.gmfAuthenticationService_ = gmfAuthenticationService;

    /**
     * @type {gmf.theme.Themes}
     * @private
     */
    this.gmfThemes_ = gmfThemes;

    this.cacheVersion_ = '0';
    if ($injector.has('cacheVersion')) {
      this.cacheVersion_ = $injector.get('cacheVersion');
    }

    /**
     * @type {boolean}
     * @export
     */
    this.scaleInput = false;

    if ($injector.has('gmfPrintOptions')) {
      this.scaleInput = $injector.get('gmfPrintOptions')['scaleInput'];
    }

    /**
     * @type {?angular.$q.Deferred}
     * @private
     */
    this.requestCanceler_ = null;

    /**
     * @type {?angular.$q.Promise}
     * @private
     */
    this.statusTimeoutPromise_ = null;

    /**
     * @type {Array.<number>|null}
     * @private
     */
    this.onDragPreviousMousePosition_ = null;

    /**
     * @type {?angular.$q.Promise|null}
     * @private
     */
    this.rotationTimeoutPromise_ = null;

    /**
     * @type {ol.EventsKey|Array.<ol.EventsKey>}
     * @private
     */
    this.postComposeListenerKey_;

    /**
     * @type {ol.EventsKey|Array.<ol.EventsKey>}
     * @private
     */
    this.pointerDragListenerKey_;

    /**
     * Current report reference id.
     * @type {string}
     * @private
     */
    this.curRef_ = '';

    /**
     * Formats availables in capabilities.
     * @type {Array.<string>}
     * @private
     */
    this.formats_ = [];

    /**
     * An array of attributes objects from capabilities.
     * @type {Array.<Object>}
     * @private
     */
    this.layouts_ = [];

    /**
     * An attributes object from capabilities.
     * @type {Object}
     * @private
     */
    this.layout_ = {};

    /**
     * @type {Array.<number>}
     * @private
     */
    this.paperSize_ = [];

    /**
     * @type {gmfx.PrintLayoutInfo}
     * @export
     */
    this.layoutInfo = {};

    /**
     * @type {number}
     * @export
     */
    this.rotation = 0;

    /**
     * @type {Array.<string>}
     * @export
     */
    this.hiddenAttributeNames;

    /**
     * @type {function(ol.render.Event)}
     */
    this.postcomposeListener_;

    /**
     * @type {angular.$http.HttpPromise}
     * @private
     */
    this.capabilities_;

    /**
     * @type {gmfThemes.GmfOgcServers}
     * @private
     */
    this.ogcServers_;

    /**
     * @type {Array.<gmfThemes.GmfTheme>}
     * @private
     */
    this.currentThemes_;
  }


  /**
   * Init the controller
   */
  $onInit() {
    // Clear the capabilities if the roleId changes
    this.$scope_.$watch(() => this.gmfAuthenticationService_.getRoleId(), () => {
      this.gmfPrintState_.state = gmf.print.component.PrintStateEnum.CAPABILITIES_NOT_LOADED;
      this.capabilities_ = null;
    });

    this.$scope_.$watch(() => this.active, (active) => {
      this.togglePrintPanel_(active);
    });

    // Print on event.
    this.$rootScope_.$on('gmfStartPrint', (event, format) => {
      this.print(`${format}`);
    });

    // Cancel print task on event.
    this.$rootScope_.$on('gmfCancelPrint', () => {
      this.cancel();
    });

    this.gmfThemes_.getOgcServersObject().then((ogcServersObject) => {
      this.ogcServers_ = ogcServersObject;
    });

    this.gmfThemes_.getThemesObject().then((currentThemes) => {
      this.currentThemes_ = currentThemes;
    });

    /**
     * @return {ol.Size} Size in dots of the map to print.
     */
    const getSizeFn = () => this.paperSize_;

    let getRotationFn;
    if (this.rotateMask) {
      /**
       * @return {number} rotation to apply.
       */
      getRotationFn = () => this.rotation;
    }

    this.postcomposeListener_ = this.ngeoPrintUtils_.createPrintMaskPostcompose(
      getSizeFn, this.getScaleFn.bind(this), getRotationFn);
  }


  /**
   * @param {olx.FrameState} frameState Frame state.
   * @return {number} Scale of the map to print.
   */
  getScaleFn(frameState) {
    // Don't compute an optimal scale if the user manualy choose a value not in
    // the pre-defined scales. (`scaleInput` in `gmfPrintOptions`).
    goog.asserts.assert(this.layoutInfo.scales);
    goog.asserts.assert(this.layoutInfo.scale !== undefined);
    if (this.layoutInfo.scale === -1 ||
        ol.array.includes(this.layoutInfo.scales, this.layoutInfo.scale)) {
      const mapSize = frameState.size;
      const viewResolution = frameState.viewState.resolution;
      this.layoutInfo.scale = this.getOptimalScale_(mapSize, viewResolution);
    }
    return this.layoutInfo.scale;
  }


  /**
   * @param {boolean} active True to listen events related to the print and get
   *     capabilities. False to stop listen them and set rotation to 0.
   * @private
   */
  togglePrintPanel_(active) {
    if (active) {
      if (!this.capabilities_) {
        this.getCapabilities_();
      }
      this.capabilities_.then((resp) => {
        // make sure the panel is still open
        if (!this.active) {
          return;
        }
        this.gmfPrintState_.state = gmf.print.component.PrintStateEnum.NOT_IN_USE;
        // Get capabilities - On success
        this.parseCapabilities_(resp);
        this.postComposeListenerKey_ = this.map.on('postcompose',
          this.postcomposeListener_);
        this.pointerDragListenerKey_ = this.map.on('pointerdrag',
          this.onPointerDrag_.bind(this));
        this.map.render();
      }, (resp) => {
        // Get capabilities - On error
        this.gmfPrintState_.state = gmf.print.component.PrintStateEnum.ERROR_ON_GETCAPABILITIES;
        this.capabilities_ = null;
      });
    } else {
      ol.Observable.unByKey(this.postComposeListenerKey_);
      ol.Observable.unByKey(this.pointerDragListenerKey_);
      this.getSetRotation(0);
      this.map.render(); // Redraw (remove) post compose mask;
    }
  }


  /**
   * Gets the print capabilities.
   * @param {number|null=} opt_roleId The role id.
   * @private
   */
  getCapabilities_(opt_roleId) {
    this.capabilities_ = this.ngeoPrint_.getCapabilities(
      /** @type {angular.$http.Config} */ ({
        withCredentials: true,
        params: opt_roleId ? {
          'role': opt_roleId,
          'cache_version': this.cacheVersion_
        } : {
          'cache_version': this.cacheVersion_
        }
      }));
  }


  /**
   * Create the list of layouts, get the formats, get the first layout in
   * gmf print v3 capabilities and then update the print panel layout information.
   * @param {!angular.$http.Response} resp Response.
   * @private
   */
  parseCapabilities_(resp) {
    const data = resp['data'];
    this.formats_ = data['formats'] || [];
    this.layouts_ = data['layouts'];
    this.layout_ = data['layouts'][0];

    this.layoutInfo.layouts = [];
    this.layouts_.forEach((layout) => {
      this.layoutInfo.layouts.push(layout.name);
    });

    this.updateFields_();
  }


  /**
   * Update layout information with the user values if there are always available in the
   * current layout otherwise use the defaults values of the layout.
   * If a field doesn't exist in the current layout, set it to undefined so the
   * view can hide it. Update also the paper size.
   * custom print templates).
   * @private
   */
  updateFields_() {
    this.layoutInfo.layout = this.layout_.name;

    const mapInfo = this.isAttributeInCurrentLayout_('map');
    goog.asserts.assertObject(mapInfo);
    const clientInfo = mapInfo['clientInfo'];
    goog.asserts.assertObject(clientInfo);
    this.paperSize_ = [clientInfo['width'], clientInfo['height']];

    this.updateCustomFields_();

    const legend = this.isAttributeInCurrentLayout_('legend');
    if (this.layoutInfo.legend === undefined) {
      this.layoutInfo.legend = !!(legend !== undefined ?
        legend : this.fieldValues['legend']);
    }

    this.layoutInfo.scales = clientInfo['scales'] || [];
    this.layoutInfo.dpis = clientInfo['dpiSuggestions'] || [];

    const mapSize = this.map.getSize();
    const viewResolution = this.map.getView().getResolution();
    this.layoutInfo.scale = this.getOptimalScale_(mapSize, viewResolution);

    this.layoutInfo.dpi =
        (this.layoutInfo.dpi && this.layoutInfo.dpis.indexOf(this.layoutInfo.dpi) > 0) ?
          this.layoutInfo.dpi : this.layoutInfo.dpis[0];

    this.layoutInfo.formats = {};
    this.formats_.forEach((format) => {
      this.layoutInfo.formats[format] = true;
    });

    this.attributesOut = this.layoutInfo['simpleAttributes'];

    // Force the update of the mask
    this.map.render();
  }


  /**
   * Update simple attributes information with gmfx.Customfield to be able to generate a form
   * from a custom GMF print v3 configuration.
   * @private
   */
  updateCustomFields_() {
    let name, rawType, value, type;
    if (!this.layoutInfo.simpleAttributes) {
      this.layoutInfo.simpleAttributes = [];
    }
    const simpleAttributes = this.layoutInfo.simpleAttributes;
    const previousAttributes = simpleAttributes.splice(0, simpleAttributes.length);

    // The attributes without 'clientParams' are the custom layout information (defined by end user).
    this.layout_.attributes.forEach((attribute) => {
      if (!attribute['clientParams']) {
        name = `${attribute.name}`;
        const defaultValue = attribute.default;
        value = (defaultValue !== undefined && defaultValue !== '') ?
          defaultValue : this.fieldValues[name];

        // Try to use existing form field type
        rawType = `${attribute.type}`;
        switch (rawType) {
          case 'String':
            type = (name === 'comments') ? 'textarea' : 'text';
            break;
          case 'Boolean':
            type = 'checkbox';
            break;
          case 'Number':
            type = 'number';
            value = parseFloat(value);
            value = isNaN(value) ? 0 : value;
            break;
          default:
            type = rawType;
        }

        // If it exists use the value of previous same field.
        previousAttributes.forEach((c) => {
          if (c.name === name && c.type === type) {
            return value = c.value;
          }
        });

        this.layoutInfo.simpleAttributes.push(/** gmfx.PrintSimpleAttributes */ ({
          name,
          type,
          value
        }));
      }
    });
  }


  /**
   * Return a capabilities 'attribute' object corresponding to the given name.
   * @param {string} name Name of the attribute to get.
   * @return {Object|null} corresponding attribute or null.
   * @private
   */
  isAttributeInCurrentLayout_(name) {
    let attr = null;
    this.layout_.attributes.forEach((attribute) => {
      if (attribute.name === name) {
        return attr = attribute;
      }
    });
    return attr;
  }


  /**
   * Getter setter to update or get the current rotation value. Param and result
   *     are in degree. Updating the rotation will redraw the mask or rorate the
   *     map (depending on the configuration);
   * @param {number=} opt_rotation The optional new rotation value.
   * @return {number} The new value of rotation;
   * @export
   */
  getSetRotation(opt_rotation) {
    if (opt_rotation !== undefined) {
      let rotation = parseInt(opt_rotation, 10);
      if (rotation > 180) {
        rotation = -180;
      } else if (rotation < -180) {
        rotation = 180;
      }
      this.rotation = rotation;

      // Render the map to update the postcompose mask or rotate the map.
      if (this.rotateMask) {
        this.map.render();
      } else {
        this.map.getView().setRotation(ol.math.toRadians(this.rotation));
      }

    }
    return this.rotation;
  }


  /**
   * Calculate the angle and the sense of rotation between two lines. One from the
   * center of the map and the point of the last call to this function and one
   * from the same center and the point of the current call.
   * @param {ol.MapBrowserPointerEvent} e An ol map browser pointer event.
   * @private
   */
  onPointerDrag_(e) {
    const originalEvent = e.originalEvent;
    const mapCenter = this.map.getView().getCenter();
    if (this.active && originalEvent.altKey && originalEvent.shiftKey && mapCenter) {
      const center = this.map.getPixelFromCoordinate(mapCenter);
      const pixel = e.pixel;
      // Reset previous position between two differents sessions of drags events.
      if (this.rotationTimeoutPromise_ === null) {
        this.onDragPreviousMousePosition_ = null;
      } else {
        // Cancel the timeout to keep this session of drags event
        this.$timeout_.cancel(this.rotationTimeoutPromise_);
        // Calculate angle and sense of rotation.
        const p0x = this.onDragPreviousMousePosition_[0] - center[0];
        const p0y = this.onDragPreviousMousePosition_[1] - center[1];
        const p1x = pixel[0] - center[0];
        const p1y = pixel[1] - center[1];
        const centerToP0 = Math.sqrt(Math.pow(p0x, 2) + Math.pow(p0y, 2));
        const centerToP1 = Math.sqrt(Math.pow(p1x, 2) + Math.pow(p1y, 2));
        const sense = (p0x * p1y - p0y * p1x) > 0 ? 1 : -1;
        let angle = (p0x * p1x + p0y * p1y) / (centerToP0 * centerToP1);
        angle = angle <= 1 ? sense * Math.acos(angle) : 0;
        const boost = centerToP1 / 200;
        const increment = Math.round(ol.math.toDegrees(angle) * boost);

        // Set rotation then update the view.
        this.getSetRotation(this.rotation + increment);
        this.$scope_.$digest();
      }
      // Prepare the removal of this session of drags events
      this.rotationTimeoutPromise_ = this.$timeout_(() => {
        this.rotationTimeoutPromise_ = null;
      }, 500);
      // Keep the current position for the next calculation.
      this.onDragPreviousMousePosition_ = pixel;
    }
  }


  /**
   * Create a print report based on the values of the 'layoutInfo' values.
   * @param {string} format An output format corresponding to one format in the
   *     capabilities document ('pdf', 'png', etc).
   * @export
   */
  print(format) {
    // Do not print if a print task is already processing.
    if (this.gmfPrintState_.state === gmf.print.component.PrintStateEnum.PRINTING) {
      return;
    }
    this.requestCanceler_ = this.$q_.defer();
    this.gmfPrintState_.state = gmf.print.component.PrintStateEnum.PRINTING;

    const mapSize = this.map.getSize();
    const viewResolution = this.map.getView().getResolution() || 0;
    const scale = this.getOptimalScale_(mapSize, viewResolution);
    const rotation = this.rotateMask ? -this.rotation : this.rotation;
    const datasource = this.getDataSource_();

    const customAttributes = {
      'datasource': datasource,
      'lang': this.gettextCatalog_.currentLanguage,
      'rotation': rotation,
      'scale': this.layoutInfo.scale
    };

    if (this.layoutInfo.simpleAttributes) {
      this.layoutInfo.simpleAttributes.forEach((field) => {
        customAttributes[field.name] = field.value;
      });
    }

    if (this.layoutInfo.legend) {
      const legend = this.getLegend_(scale);
      if (legend !== null) {
        customAttributes['legend'] = this.getLegend_(scale);
      }
    }

    goog.asserts.assertNumber(this.layoutInfo.dpi);
    goog.asserts.assertString(this.layoutInfo.layout);

    // convert the WMTS layers to WMS
    const map = new ol.Map({});
    map.setView(this.map.getView());
    const ol_layers = this.ngeoLayerHelper_.getFlatLayers(this.map.getLayerGroup());
    const new_ol_layers = [];
    for (let i = 0, ii = ol_layers.length; i < ii; i++) {
      let layer = ol_layers[i];
      const metadata = layer.get('metadata');
      if (metadata) {
        const server_name = metadata.ogcServer;
        const layer_names = metadata.printLayers || metadata.layers;
        if (server_name && layer_names) {
          const server = this.ogcServers_[server_name];
          if (server) {
            layer = this.ngeoLayerHelper_.createBasicWMSLayer(
              server.url,
              layer_names,
              server.imageType,
              server.type
            );
          } else {
            console.error('Missing ogcServer:', server_name);
          }
        }
      }
      new_ol_layers.push(layer);
    }
    map.setLayerGroup(new ol.layer.Group({
      layers: new_ol_layers
    }));

    const spec = this.ngeoPrint_.createSpec(map, scale, this.layoutInfo.dpi,
      this.layoutInfo.layout, format, customAttributes);

    // Add feature overlay layer to print spec.
    const layers = [];
    this.ngeoPrint_.encodeLayer(layers, this.featureOverlayLayer_,
      viewResolution);
    if (layers.length > 0) {
      spec.attributes.map.layers.unshift(layers[0]);
    }

    this.ngeoPrint_.createReport(spec, /** @type {angular.$http.Config} */ ({
      timeout: this.requestCanceler_.promise
    })).then(
      this.handleCreateReportSuccess_.bind(this),
      this.handleCreateReportError_.bind(this)
    );

    // remove temporary map
    map.setTarget(null);
  }


  /**
   * Cancel the current print and reset its state.
   * @export
   */
  cancel() {
    // Cancel the latest request, if it's not finished yet.
    if (this.requestCanceler_ !== null) {
      this.requestCanceler_.resolve();
    }

    // Cancel the status timeout if there's one set, to make sure no other
    // status request is sent.
    if (this.statusTimeoutPromise_ !== null) {
      this.$timeout_.cancel(this.statusTimeoutPromise_);
    }

    if (this.curRef_.length > 0) {
      this.ngeoPrint_.cancel(this.curRef_);
    }

    this.resetPrintStates_();
  }


  /**
   * @param {gmf.print.component.PrintStateEnum=} opt_printState the print state.
   * @private
   */
  resetPrintStates_(opt_printState) {
    this.gmfPrintState_.state = opt_printState || gmf.print.component.PrintStateEnum.NOT_IN_USE;
    this.curRef_ = '';
  }


  /**
   * Get datasource object for print report
   * @private
   * @return {Array.<gmfx.datasource.DataSourcePrintReportObject>} the data
   *     source objet for the print report
   */
  getDataSource_() {
    let datasourceObj, data, columns;
    const datasourceArr = [];
    const sources = this.ngeoQueryResult_.sources;
    sources.forEach(function(source) {
      data = [];
      columns = [];
      source.features.forEach(function(feature, i) {
        goog.asserts.assert(feature);
        const properties = ngeo.misc.FeatureHelper.getFilteredFeatureValues(feature);
        if (i === 0) {
          columns = Object.keys(properties).map(function tanslateColumns(prop) {
            return this.translate_(prop);
          }, this);
        }
        data.push(Object.keys(properties).map(key => properties[key]));
      }, this);
      if (columns.length) {
        datasourceObj =
          /** @type {gmfx.datasource.DataSourcePrintReportObject} */({
            title: this.translate_(source.label),
            table: {
              columns,
              data
            }
          });
        datasourceArr.push(datasourceObj);
      }
    }, this);
    return datasourceArr;
  }


  /**
   * Get the optimal scale to display the print mask. Return the first scale if
   * no scale matches.
   * @param {ol.Size|undefined} mapSize Size of the map on the screen (px).
   * @param {number|undefined} viewResolution Resolution of the map on the screen.
   * @return {number} The best scale. -1 is returned if there is no optimal
   *     scale, that is the optimal scale is lower than or equal to the first
   *     value in printMapScales.
   * @private
   */
  getOptimalScale_(mapSize, viewResolution) {
    const scales = this.layoutInfo.scales.slice();
    if (mapSize !== undefined && viewResolution !== undefined) {
      return this.ngeoPrintUtils_.getOptimalScale(mapSize, viewResolution,
        this.paperSize_, scales.reverse());
    }
    return this.layoutInfo.scales[0];
  }


  /**
   * @param {!angular.$http.Response} resp Response.
   * @private
   */
  handleCreateReportSuccess_(resp) {
    const mfResp = /** @type {MapFishPrintReportResponse} */ (resp.data);
    const ref = mfResp.ref;
    goog.asserts.assert(ref.length > 0);
    this.curRef_ = ref;
    this.getStatus_(ref);
  }


  /**
   * @param {string} ref Ref.
   * @private
   */
  getStatus_(ref) {
    this.requestCanceler_ = this.$q_.defer();
    this.ngeoPrint_.getStatus(ref, /** @type {angular.$http.Config} */ ({
      timeout: this.requestCanceler_.promise
    })).then(
      this.handleGetStatusSuccess_.bind(this, ref),
      this.handleCreateReportError_.bind(this)
    );
  }


  /**
   * @param {string} ref Ref.
   * @param {!angular.$http.Response} resp Response.
   * @private
   */
  handleGetStatusSuccess_(ref, resp) {
    const mfResp = /** @type {MapFishPrintStatusResponse} */ (resp.data);
    const done = mfResp.done;
    if (done) {
      if (mfResp.status != 'error') {
        // The report is ready. Open it by changing the window location.
        window.location.href = this.ngeoPrint_.getReportUrl(ref);
        this.resetPrintStates_();
      } else {
        console.error(mfResp.error);
        this.handleCreateReportError_();
      }
    } else {
      // The report is not ready yet. Check again in 1s.
      this.statusTimeoutPromise_ = this.$timeout_(() => {
        this.getStatus_(ref);
      }, 1000, false);
    }
  }


  /**
   * @private
   */
  handleCreateReportError_() {
    this.resetPrintStates_(gmf.print.component.PrintStateEnum.ERROR_ON_REPORT);
  }


  /**
   * @param {number} scale The scale to get the legend (for wms layers only).
   * @return {Object?} Legend object for print report or null.
   * @private
   */
  getLegend_(scale) {
    const legend = {'classes': []};
    let classes, layerNames, layerName, icons;
    const gettextCatalog = this.gettextCatalog_;

    // Get layers from layertree only.
    const dataLayerGroup = this.ngeoLayerHelper_.getGroupFromMap(this.map,
      gmf.DATALAYERGROUP_NAME);
    const layers = this.ngeoLayerHelper_.getFlatLayers(dataLayerGroup);

    // For each visible layer in reverse order, get the legend url.
    layers.reverse().forEach((layer) => {
      classes = [];
      if (layer.getVisible() && layer.getSource()) {
        // For WMTS layers.
        if (layer instanceof ol.layer.Tile) {
          layerName = `${layer.get('layerNodeName')}`;
          icons = this.getMetadataLegendImage_(layerName);
          if (!icons) {
            icons = this.ngeoLayerHelper_.getWMTSLegendURL(layer);
          }
          // Don't add classes without legend url.
          if (icons) {
            classes.push({
              'name': gettextCatalog.getString(layerName),
              'icons': [icons]
            });
          }
        } else {
          const source = /** @type ol.source.ImageWMS */ (layer.getSource());
          // For each name in a WMS layer.
          layerNames = source.getParams()['LAYERS'].split(',');
          layerNames.forEach((name) => {
            icons = this.getMetadataLegendImage_(name);
            if (!icons) {
              icons = this.ngeoLayerHelper_.getWMSLegendURL(source.getUrl(), name,
                scale);
            }
            // Don't add classes without legend url or from layers without any
            // active name.
            if (icons && name.length !== 0) {
              classes.push({
                'name': gettextCatalog.getString(name),
                'icons': [icons]
              });
            }
          });
        }
      }

      // Add classes object only if it contains something.
      if (classes.length > 0) {
        legend['classes'].push({'classes': classes});
      }

    });

    return legend['classes'].length > 0 ?  legend : null;
  }


  /**
   * Return the metadata legendImage of a layer from the found corresponding node
   * or undefined.
   * @param {string} layerName a layer name.
   * @return {string|undefined} The legendImage or undefined.
   * @private
   */
  getMetadataLegendImage_(layerName) {
    const groupNode = gmf.theme.Themes.findGroupByLayerNodeName(this.currentThemes_, layerName);
    let node;
    if (groupNode && groupNode.children) {
      node = gmf.theme.Themes.findObjectByName(groupNode.children, layerName);
    }
    let legendImage;
    if (node && node.metadata) {
      legendImage = node.metadata.legendImage;
    }
    return legendImage;
  }


  /**
   * Set the current layout and update all layout information with this new layout parameters.
   * @param {string!} layoutName A layout name as existing in the list of
   *     existing layouts.
   * @export
   */
  setLayout(layoutName) {
    let layout;
    this.layouts_.forEach((l) => {
      if (l.name === layoutName) {
        layout = l;
        return true; // break;
      }
    });
    this.layout_ = layout;
    this.updateFields_();
  }


  /**
   * Get or set the print scale value and adapt the zoom to match with this new scale.
   * @param {number=} opt_scale A scale value as existing in the scales list field.
   * @return {number|undefined} New scale.
   * @export
   */
  getSetScale(opt_scale) {
    if (opt_scale !== undefined) {
      const mapSize = this.map.getSize() || [0, 0];
      this.layoutInfo.scale = opt_scale;
      const res = this.ngeoPrintUtils_.getOptimalResolution(mapSize, this.paperSize_, opt_scale);
      const contrainRes = this.map.getView().constrainResolution(res, 0, 1);
      this.map.getView().setResolution(contrainRes);
    }
    return this.layoutInfo.scale;
  }


  /**
   * Set the print dpi value.
   * @param {number} dpi A dpi value as existing in the dpis list field.
   * @export
   */
  setDpi(dpi) {
    this.layoutInfo.dpi = dpi;
  }


  /**
   * Check the current state of the print.
   * @param {string} stateEnumKey An enum key from gmf.print.component.PrintStateEnum.
   * @return {boolean} True if the given state matches with the current print
   *     state. False otherwise.
   * @export
   */
  isState(stateEnumKey) {
    return this.gmfPrintState_.state === gmf.print.component.PrintStateEnum[stateEnumKey];
  }
};

gmf.print.component.controller('GmfPrintController', gmf.print.component.Controller_);
