goog.provide('gmf.permalink.Permalink');

goog.require('gmf');
/** @suppress {extraRequire} */
goog.require('gmf.theme.Manager');
goog.require('gmf.theme.Themes');
goog.require('ngeo');
goog.require('ngeo.Popover');
/** @suppress {extraRequire} */
goog.require('ngeo.draw.features');
goog.require('ngeo.datasource.Group');
goog.require('ngeo.datasource.OGC');
/** @suppress {extraRequire} */
goog.require('ngeo.datasource.WMSGroup');
goog.require('ngeo.olcs.constants');
goog.require('ngeo.format.FeatureHash');
goog.require('ngeo.format.FeatureProperties');
/** @suppress {extraRequire} */
goog.require('ngeo.misc.debounce');
goog.require('ngeo.misc.EventHelper');
goog.require('ngeo.statemanager.module');
goog.require('ngeo.layertree.Controller');
goog.require('goog.asserts');
goog.require('ol');
goog.require('ol.array');
goog.require('ol.events');
goog.require('ol.Feature');
goog.require('ol.geom.Point');
goog.require('ol.proj');
goog.require('ol.style.Stroke');
goog.require('ol.style.RegularShape');
goog.require('ol.style.Style');
goog.require('ol.layer.Group');


/**
 * The Permalink service for GMF, which uses the `ngeo.statemanager.Service` to
 * manage the GMF application state. Here's the list of states are are managed:
 *
 * - the map center and zoom level
 * - the current background layer selected
 * - whether to add a crosshair feature in the map or not
 * - the dimensions value
 *
 * To have the whole possibilities offer by the permalink, these services
 * should be instantiated: ngeoBackgroundLayerMgr, ngeoFeatureOverlayMgr,
 * ngeoFeatureHelper, gmfPermalinkOptions, gmfThemes, gmfObjectEditingManager,
 * gmfThemeManager, defaultTheme, gmfTreeManager, ngeoWfsPermalink,
 * ngeoAutoProjection and ngeoFeatures.
 *
 * @constructor
 * @struct
 * @param {!angular.$q} $q The Angular $q service.
 * @param {angular.$timeout} $timeout Angular timeout service.
 * @param {angular.Scope} $rootScope Angular rootScope.
 * @param {angular.$injector} $injector Main injector.
 * @param {ngeox.miscDebounce} ngeoDebounce ngeo Debounce factory.
 * @param {ngeo.misc.EventHelper} ngeoEventHelper Ngeo event helper service
 * @param {ngeo.statemanager.Service} ngeoStateManager The ngeo statemanager service.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @ngInject
 * @ngdoc service
 * @ngname gmfPermalink
 */
gmf.permalink.Permalink = function($q, $timeout, $rootScope, $injector, ngeoDebounce, ngeoEventHelper,
  ngeoStateManager, ngeoLocation) {

  /**
   * @type {!angular.$q}
   * @private
   */
  this.q_ = $q;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.rootScope_ = $rootScope;

  /**
   * @type {angular.$timeout}
   * @private
   */
  this.$timeout_ = $timeout;

  // == listener keys ==

  /**
   * The key for map view 'propertychange' event.
   * @type {?ol.EventsKey}
   * @private
   */
  this.mapViewPropertyChangeEventKey_ = null;

  // == properties from params ==

  /**
   * @type {ngeox.miscDebounce}
   * @private
   */
  this.ngeoDebounce_ = ngeoDebounce;

  /**
   * @type {ngeo.misc.EventHelper}
   * @private
   */
  this.ngeoEventHelper_ = ngeoEventHelper;

  /**
   * @type {ngeo.statemanager.Service}
   * @private
   */
  this.ngeoStateManager_ = ngeoStateManager;

  /**
   * @type {?ol.Collection.<ol.Feature>}
   * @private
   */
  this.ngeoFeatures_ = $injector.has('ngeoFeatures') ?
    $injector.get('ngeoFeatures') : null;

  /**
   * @type {?ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.ngeoBackgroundLayerMgr_ = $injector.has('ngeoBackgroundLayerMgr') ?
    $injector.get('ngeoBackgroundLayerMgr') : null;

  /**
   * @type {?ngeo.map.FeatureOverlayMgr}
   */
  const ngeoFeatureOverlayMgr = $injector.has('ngeoFeatureOverlayMgr') ?
    $injector.get('ngeoFeatureOverlayMgr') : null;

  /**
   * @type {?ngeo.map.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr ?
    ngeoFeatureOverlayMgr.getFeatureOverlay() : null;

  /**
   * @type {?ngeo.misc.FeatureHelper}
   * @private
   */
  this.featureHelper_ = $injector.has('ngeoFeatureHelper') ?
    $injector.get('ngeoFeatureHelper') : null;

  /**
   * @type {?ngeo.query.Querent}
   * @private
   */
  this.ngeoQuerent_ = $injector.has('ngeoQuerent') ?
    $injector.get('ngeoQuerent') : null;

  /**
   * The options to configure the gmf permalink service with.
   * @type {!gmfx.PermalinkOptions}
   */
  const gmfPermalinkOptions = $injector.has('gmfPermalinkOptions') ?
    $injector.get('gmfPermalinkOptions') : {};
  if (gmfPermalinkOptions.useLocalStorage === true) {
    // localStorage is deactivated by default
    this.ngeoStateManager_.setUseLocalStorage(true);
  }

  /**
   * @type {boolean}
   * @private
   */
  this.crosshairEnabledByDefault_ = !!gmfPermalinkOptions.crosshairEnabledByDefault;

  /**
   * @type {?gmf.datasource.ExternalDataSourcesManager}
   * @private
   */
  this.gmfExternalDataSourcesManager_ =
    $injector.has('gmfExternalDataSourcesManager') ?
      $injector.get('gmfExternalDataSourcesManager') : null;

  /**
   * @type {?gmf.theme.Themes}
   * @private
   */
  this.gmfThemes_ = $injector.has('gmfThemes') ? $injector.get('gmfThemes') : null;

  /**
   * @type {?gmf.objectediting.Manager}
   * @private
   */
  this.gmfObjectEditingManager_ = $injector.has('gmfObjectEditingManager') ?
    $injector.get('gmfObjectEditingManager') : null;

  /**
   * @type {?gmf.theme.Manager}
   * @private
   */
  this.gmfThemeManager_ = $injector.has('gmfThemeManager') ?
    $injector.get('gmfThemeManager') : null;

  /**
   * @type {string|undefined}
   * @private
   */
  this.defaultTheme_ = $injector.has('defaultTheme') ?
    $injector.get('defaultTheme') : undefined;

  /**
   * @type {?gmf.layertree.TreeManager}
   * @private
   */
  this.gmfTreeManager_ = $injector.has('gmfTreeManager') ?
    $injector.get('gmfTreeManager') : null;

  // == other properties ==

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {?ngeo.statemanager.WfsPermalink}
   * @private
   */
  this.ngeoWfsPermalink_ = $injector.has('ngeoWfsPermalink') ?
    $injector.get('ngeoWfsPermalink') : null;

  /**
   * @type {?gmfx.User}
   * @export
   */
  this.gmfUser_ = $injector.has('gmfUser') ?
    $injector.get('gmfUser') : null;

  /**
   * @type {?ol.Map}
   * @private
   */
  this.map_ = null;

  /**
   * @type {?ngeo.misc.AutoProjection}
   * @private
   */
  this.ngeoAutoProjection_ = $injector.has('ngeoAutoProjection') ?
    $injector.get('ngeoAutoProjection') : null;

  /**
   * A list of projections that the coordinates in the permalink can be in.
   * @type {?Array.<ol.proj.Projection>}
   * @private
   */
  this.sourceProjections_ = null;
  if (gmfPermalinkOptions.projectionCodes !== undefined && this.ngeoAutoProjection_) {
    const projections = this.ngeoAutoProjection_.getProjectionList(gmfPermalinkOptions.projectionCodes);
    if (projections.length > 0) {
      this.sourceProjections_ = projections;
    }
  }

  /**
   * @type {?ol.Feature}
   * @private
   */
  this.crosshairFeature_ = null;

  /**
   * @type {Array<(null|ol.style.Style)>|null|ol.FeatureStyleFunction|ol.style.Style}
   * @private
   */
  this.crosshairStyle_;

  if (gmfPermalinkOptions.crosshairStyle !== undefined) {
    this.crosshairStyle_ = gmfPermalinkOptions.crosshairStyle;
  } else {
    this.crosshairStyle_ = [new ol.style.Style({
      image: new ol.style.RegularShape({
        stroke: new ol.style.Stroke({
          color: 'rgba(255, 255, 255, 0.8)',
          width: 5
        }),
        points: 4,
        radius: 8,
        radius2: 0,
        angle: 0
      })
    }), new ol.style.Style({
      image: new ol.style.RegularShape({
        stroke: new ol.style.Stroke({
          color: 'rgba(255, 0, 0, 1)',
          width: 2
        }),
        points: 4,
        radius: 8,
        radius2: 0,
        angle: 0
      })
    })];
  }

  /**
   * @type {?ngeo.Popover}
   * @private
   */
  this.mapTooltip_ = null;

  /**
   * @type {ngeo.format.FeatureHash}
   * @private
   */
  this.featureHashFormat_ = new ngeo.format.FeatureHash({
    setStyle: false,
    encodeStyles: false,
    propertiesType: {
      'fillColor': ngeo.format.FeatureProperties.COLOR,
      'fillOpacity': ngeo.format.FeatureProperties.OPACITY,
      'fontColor': ngeo.format.FeatureProperties.COLOR,
      'fontSize': ngeo.format.FeatureProperties.SIZE,
      'isBox': ngeo.format.FeatureProperties.IS_RECTANGLE,
      'isCircle': ngeo.format.FeatureProperties.IS_CIRCLE,
      'isLabel': ngeo.format.FeatureProperties.IS_TEXT,
      'name': ngeo.format.FeatureProperties.NAME,
      'pointRadius': ngeo.format.FeatureProperties.SIZE,
      'showLabel': ngeo.format.FeatureProperties.SHOW_LABEL,
      'showMeasure': ngeo.format.FeatureProperties.SHOW_MEASURE,
      'strokeColor': ngeo.format.FeatureProperties.COLOR,
      'strokeWidth': ngeo.format.FeatureProperties.STROKE
    }
  });

  // == event listeners ==

  if (this.ngeoBackgroundLayerMgr_) {
    ol.events.listen(
      this.ngeoBackgroundLayerMgr_,
      'change',
      this.handleBackgroundLayerManagerChange_,
      this);
  }

  // visibility
  this.rootScope_.$on('ngeo-layertree-state', (event, treeCtrl, firstParent) => {
    const newState = {};
    if (firstParent.node.mixed) {
      const state = treeCtrl.getState();
      goog.asserts.assert(state === 'on' || state === 'off');
      const visible = state === 'on';
      treeCtrl.traverseDepthFirst((ctrl) => {
        if (ctrl.node.children === undefined) {
          const param = gmf.permalink.Permalink.ParamPrefix.TREE_ENABLE + ctrl.node.name;
          newState[param] = visible;
        }
      });
    } else {
      const gmfLayerNames = [];
      firstParent.traverseDepthFirst((ctrl) => {
        if (ctrl.node.children === undefined && ctrl.getState() === 'on') {
          gmfLayerNames.push(ctrl.node.name);
        }
      });
      newState[gmf.permalink.Permalink.ParamPrefix.TREE_GROUP_LAYERS + firstParent.node.name] = gmfLayerNames.join(',');
    }
    this.ngeoStateManager_.updateState(newState);
  });
  this.rootScope_.$on('ngeo-layertree-opacity', (event, treeCtrl) => {
    const newState = {};
    const opacity = treeCtrl.layer.getOpacity();
    const stateName = (treeCtrl.parent.node.mixed ?
      gmf.permalink.Permalink.ParamPrefix.TREE_OPACITY : gmf.permalink.Permalink.ParamPrefix.TREE_GROUP_OPACITY
    ) + treeCtrl.node.name;
    newState[stateName] = opacity;
    this.ngeoStateManager_.updateState(newState);
  });

  // ngeoFeatures
  //   (1) read from features from the state manager first, add them
  //   (2) listen for further features added/removed
  const features = this.getFeatures();
  if (this.ngeoFeatures_) {
    features.forEach(function(feature) {
      if (this.featureHelper_) {
        this.featureHelper_.setStyle(feature);
      }
      this.addNgeoFeature_(feature);
    }, this);

    this.ngeoFeatures_.extend(features);
    ol.events.listen(this.ngeoFeatures_, 'add', this.handleNgeoFeaturesAdd_, this);
    ol.events.listen(this.ngeoFeatures_, 'remove', this.handleNgeoFeaturesRemove_, this);
  }

  if (this.featureHelper_) {
    this.rootScope_.$on('$localeChangeSuccess', () => {
      features.forEach(function(feature) {
        this.featureHelper_.setStyle(feature);
      }, this);
    });
  }

  if (this.gmfThemeManager_) {
    this.rootScope_.$on(gmf.theme.Manager.EventType.THEME_NAME_SET, (event, name) => {
      this.setThemeInUrl_(name);
    });
  }

  // External DataSources

  /**
   * @type {?angular.$q.Promise}
   * @private
   */
  this.setExternalDataSourcesStatePromise_ = null;

  if (this.ngeoQuerent_ && this.gmfExternalDataSourcesManager_) {
    // First, load the external data sources that are defined in the url
    this.initExternalDataSources_().then(() => {
      // Then, listen to the changes made to the external data sources to
      // update the url accordingly.
      ol.events.listen(
        this.gmfExternalDataSourcesManager_.wmsGroupsCollection,
        'add',
        this.handleExternalDSGroupCollectionAdd_,
        this
      );
      ol.events.listen(
        this.gmfExternalDataSourcesManager_.wmsGroupsCollection,
        'remove',
        this.handleExternalDSGroupCollectionRemove_,
        this
      );
      ol.events.listen(
        this.gmfExternalDataSourcesManager_.wmtsGroupsCollection,
        'add',
        this.handleExternalDSGroupCollectionAdd_,
        this
      );
      ol.events.listen(
        this.gmfExternalDataSourcesManager_.wmtsGroupsCollection,
        'remove',
        this.handleExternalDSGroupCollectionRemove_,
        this
      );

      // We also need to 'register' the existing groups as well, i.e. those
      // that were created by the Permalink
      for (const wmsGroup of this.gmfExternalDataSourcesManager_.wmsGroups) {
        this.registerExternalDSGroup_(wmsGroup);
      }
      for (const wmtsGroup of this.gmfExternalDataSourcesManager_.wmtsGroups) {
        this.registerExternalDSGroup_(wmtsGroup);
      }
    });
  }

  this.initLayers_();
};

// === Map X, Y, Z ===

/**
 * Get the coordinate to use to initialize the map view from the state manager.
 * @return {?ol.Coordinate} The coordinate for the map view center.
 * @export
 */
gmf.permalink.Permalink.prototype.getMapCenter = function() {
  const x = this.ngeoStateManager_.getInitialNumberValue(gmf.PermalinkParam.MAP_X);
  const y = this.ngeoStateManager_.getInitialNumberValue(gmf.PermalinkParam.MAP_Y);

  if (!isNaN(x) && !isNaN(y)) {
    const center = [x, y];
    if (this.sourceProjections_ !== null && this.ngeoAutoProjection_) {
      const targetProjection = this.map_.getView().getProjection();
      const reprojectedCenter = this.ngeoAutoProjection_.tryProjectionsWithInversion(
        center, targetProjection.getExtent(), targetProjection,
        this.sourceProjections_);
      if (reprojectedCenter) {
        return reprojectedCenter;
      }
    }
    return center;
  }
  return null;
};


/**
 * Get the zoom level to use to initialize the map view from the state manager.
 * @return {number|undefined} The zoom for the map view.
 * @export
 */
gmf.permalink.Permalink.prototype.getMapZoom = function() {
  const zoom = this.ngeoStateManager_.getInitialNumberValue(gmf.PermalinkParam.MAP_Z);
  return isNaN(zoom) ? undefined : zoom;
};


// === Map crosshair ===


/**
 * Get the map crosshair property from the state manager, if defined.
 * @return {boolean} Whether map crosshair property is set or not.
 * @export
 */
gmf.permalink.Permalink.prototype.getMapCrosshair = function() {
  const crosshair = this.ngeoStateManager_.getInitialBooleanValue(gmf.PermalinkParam.MAP_CROSSHAIR);
  return crosshair === undefined ? this.crosshairEnabledByDefault_ : crosshair;
};


/**
 * Sets the map crosshair to the center (or the map center if nothing provided).
 * Overwrites an existing map crosshair.
 * @param {?ol.Coordinate=} opt_center Optional center coordinate.
 */
gmf.permalink.Permalink.prototype.setMapCrosshair = function(opt_center) {
  let crosshairCoordinate;
  if (opt_center) {
    crosshairCoordinate = opt_center;
  } else {
    crosshairCoordinate = this.map_.getView().getCenter();
  }
  goog.asserts.assertArray(crosshairCoordinate);

  // remove existing crosshair first
  if (this.crosshairFeature_) {
    this.featureOverlay_.removeFeature(this.crosshairFeature_);
  }
  // set new crosshair
  this.crosshairFeature_ = new ol.Feature(
    new ol.geom.Point(crosshairCoordinate));
  this.crosshairFeature_.setStyle(this.crosshairStyle_);

  // add to overlay
  this.featureOverlay_.addFeature(this.crosshairFeature_);
};


// === Map tooltip ===


/**
 * Get the tooltip text from the state manager.
 * @return {string|undefined} Tooltip text.
 * @export
 */
gmf.permalink.Permalink.prototype.getMapTooltip = function() {
  return this.ngeoStateManager_.getInitialStringValue(gmf.PermalinkParam.MAP_TOOLTIP);
};

/**
 * Sets the map tooltip to the center (or the map center if nothing provided).
 * Overwrites an existing map tooltip.
 * @param {string} tooltipText Text to display in tooltip.
 * @param {?ol.Coordinate=} opt_center Optional center coordinate.
 */
gmf.permalink.Permalink.prototype.setMapTooltip = function(tooltipText, opt_center) {
  let tooltipPosition;
  if (opt_center) {
    tooltipPosition = opt_center;
  } else {
    tooltipPosition = this.map_.getView().getCenter();
  }
  goog.asserts.assertArray(tooltipPosition);

  const div = $('<div/>', {
    'class': 'gmf-permalink-tooltip',
    'text': tooltipText
  })[0];

  if (this.mapTooltip_ !== null) {
    this.map_.removeOverlay(this.mapTooltip_);
  }

  this.mapTooltip_ = new ngeo.Popover({
    element: div,
    position: tooltipPosition
  });

  this.map_.addOverlay(this.mapTooltip_);
};


// === NgeoFeatures (A.K.A. DrawFeature, RedLining) ===


/**
 * Get the ngeo features from the state manager for initialization purpose
 * @return {!Array.<!ol.Feature>} The features read from the state manager.
 * @export
 */
gmf.permalink.Permalink.prototype.getFeatures = function() {
  const f = this.ngeoStateManager_.getInitialStringValue(gmf.PermalinkParam.FEATURES);
  if (f !== undefined && f !== '') {
    return goog.asserts.assert(this.featureHashFormat_.readFeatures(f));
  }
  return [];
};


/**
 * @param {!Object.<string, string>} dimensions The global dimensions object.
 * @export
 */
gmf.permalink.Permalink.prototype.setDimensions = function(dimensions) {
  // apply initial state
  const keys = this.ngeoLocation_.getParamKeysWithPrefix(gmf.permalink.Permalink.ParamPrefix.DIMENSIONS);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = this.ngeoLocation_.getParam(key);
    goog.asserts.assert(value);
    dimensions[key.slice(gmf.permalink.Permalink.ParamPrefix.DIMENSIONS.length)] = value;
  }

  this.rootScope_.$watchCollection(() => dimensions, (dimensions) => {
    const params = {};
    for (const key in dimensions) {
      params[gmf.permalink.Permalink.ParamPrefix.DIMENSIONS + key] = dimensions[key];
    }
    this.ngeoLocation_.updateParams(params);
  });
};


/**
 * Bind an ol3 map object to this service. The service will, from there on,
 * listen to the properties changed within the map view and update the following
 * state properties: map_x, map_y and map_zoom.
 *
 * If the service is already bound to a map, those events are unlistened first.
 *
 * @param {?ol.Map} map The ol3 map object.
 * @export
 */
gmf.permalink.Permalink.prototype.setMap = function(map) {

  if (map === this.map_) {
    return;
  }

  if (this.map_) {
    this.unregisterMap_();
    this.map_ = null;
  }

  if (map) {
    this.map_ = map;
    if (this.gmfObjectEditingManager_) {
      this.gmfObjectEditingManager_.getFeature().then((feature) => {
        this.registerMap_(map, feature);
      });
    } else {
      this.registerMap_(map, null);
    }
  }

};


/**
 * Listen to the map view property change and update the state accordingly.
 * @param {ol.Map} map The ol3 map object.
 * @param {?ol.Feature} oeFeature ObjectEditing feature
 * @private
 */
gmf.permalink.Permalink.prototype.registerMap_ = function(map, oeFeature) {

  const view = map.getView();
  let center;

  // (1) Initialize the map view with either:
  //     a) the given ObjectEditing feature
  //     b) the X, Y and Z available within the permalink service, if available
  if (oeFeature && oeFeature.getGeometry()) {
    const size = map.getSize();
    goog.asserts.assert(size);
    view.fit(oeFeature.getGeometry().getExtent(), size);
  } else {
    const enabled3d = this.ngeoStateManager_.getInitialBooleanValue(ngeo.olcs.constants.Permalink3dParam.ENABLED);
    if (!enabled3d) {
      center = this.getMapCenter();
      if (center) {
        view.setCenter(center);
      }
      const zoom = this.getMapZoom();
      if (zoom !== undefined) {
        view.setZoom(zoom);
      }
    }
  }


  // (2) Listen to any property changes within the view and apply them to
  //     the permalink service
  this.mapViewPropertyChangeEventKey_ = ol.events.listen(
    view,
    'propertychange',
    this.ngeoDebounce_(() => {
      const center = view.getCenter();
      const zoom = view.getZoom();
      const object = {};
      object[gmf.PermalinkParam.MAP_X] = Math.round(center[0]);
      object[gmf.PermalinkParam.MAP_Y] = Math.round(center[1]);
      object[gmf.PermalinkParam.MAP_Z] = zoom;
      this.ngeoStateManager_.updateState(object);
    }, 300, /* invokeApply */ true),
    this);

  // (3) Add map crosshair, if set
  if (this.getMapCrosshair() && this.featureOverlay_) {
    this.setMapCrosshair(center);
  }

  // (4) Add map tooltip, if set
  const tooltipText = this.getMapTooltip();
  if (tooltipText) {
    this.setMapTooltip(tooltipText, center);
  }

  // (6) check for a wfs permalink
  const wfsPermalinkData = this.getWfsPermalinkData_();
  if (wfsPermalinkData !== null && this.ngeoWfsPermalink_) {
    this.ngeoWfsPermalink_.issue(wfsPermalinkData, map);
  }
};


/**
 * Remove any event listeners from the current map.
 * @private
 */
gmf.permalink.Permalink.prototype.unregisterMap_ = function() {
  goog.asserts.assert(
    this.mapViewPropertyChangeEventKey_, 'Key should be thruthy');
  ol.events.unlistenByKey(this.mapViewPropertyChangeEventKey_);
  this.mapViewPropertyChangeEventKey_ = null;
};


// === Background layer ===


/**
 * Get the background layer object to use to initialize the map from the
 * state manager.
 * @param {!Array.<!ol.layer.Base>} layers Array of background layer objects.
 * @return {?ol.layer.Base} Background layer.
 * @export
 */
gmf.permalink.Permalink.prototype.getBackgroundLayer = function(layers) {
  const layerName = this.ngeoStateManager_.getInitialStringValue(gmf.PermalinkParam.BG_LAYER);
  if (layerName !== undefined) {
    for (const layer of layers) {
      if (layer.get('label') === layerName) {
        return layer;
      }
    }
  }
  return null;
};


/**
 * Called when the background layer changes. Update the state using the
 * background layer label, i.e. its name.
 * @private
 */
gmf.permalink.Permalink.prototype.handleBackgroundLayerManagerChange_ = function() {
  if (!this.map_ || !this.ngeoBackgroundLayerMgr_) {
    return;
  }

  // get layer label, i.e its name
  const layer = this.ngeoBackgroundLayerMgr_.get(this.map_);
  const layerName = layer.get('label');
  goog.asserts.assertString(layerName);

  // set it in state
  const object = {};
  object[gmf.PermalinkParam.BG_LAYER] = layerName;
  this.ngeoStateManager_.updateState(object);
};


// === Layers (layer tree) ===


/**
 * Get the current first level node names in the tree manager and update the
 * correspondent state of the permalink.
 * @export
 */
gmf.permalink.Permalink.prototype.refreshFirstLevelGroups = function() {
  if (!this.gmfTreeManager_) {
    return;
  }
  // Get first-level-groups order
  const groupNodes = this.gmfTreeManager_.rootCtrl.node.children;
  const orderedNames = groupNodes.map(node => node.name);

  // set it in state
  const object = {};
  object[gmf.PermalinkParam.TREE_GROUPS] = orderedNames.join(',');
  this.ngeoStateManager_.updateState(object);
};


/**
 * Return true if there is a theme specified in the URL path.
 * @private
 * @param {Array.<string>} pathElements Array of path elements.
 * @return {boolean} theme in path.
 */
gmf.permalink.Permalink.prototype.themeInUrl_ = function(pathElements) {
  const indexOfTheme = pathElements.indexOf('theme');
  return indexOfTheme != -1 && indexOfTheme == pathElements.length - 2;
};


/**
 * @param {string} themeName Theme name.
 * @private
 */
gmf.permalink.Permalink.prototype.setThemeInUrl_ = function(themeName) {
  if (themeName) {
    const pathElements = this.ngeoLocation_.getPath().split('/');
    goog.asserts.assert(pathElements.length > 1);
    if (pathElements[pathElements.length - 1] === '') {
      // case where the path is just "/"
      pathElements.splice(pathElements.length - 1);
    }
    if (this.themeInUrl_(pathElements)) {
      pathElements[pathElements.length - 1] = themeName;
    } else {
      pathElements.push('theme', themeName);
    }
    this.ngeoLocation_.setPath(pathElements.join('/'));
  }
};


/**
 * Get the default theme from url, local storage, user functionalities or
 * defaultTheme constant.
 * @return {?string} default theme name.
 * @export
 */
gmf.permalink.Permalink.prototype.defaultThemeName = function() {

  // check if we have a theme in url
  const pathElements = this.ngeoLocation_.getPath().split('/');
  if (this.themeInUrl_(pathElements)) {
    return pathElements[pathElements.length - 1];
  }

  // check if we have a theme in the local storage
  const tn = this.ngeoStateManager_.getInitialStringValue('theme');
  if (tn) {
    return tn;
  }

  const defaultTheme = this.defaultThemeNameFromFunctionalities();
  if (defaultTheme !== null) {
    return defaultTheme;
  }

  // fallback to the defaultTheme constant
  if (this.defaultTheme_) {
    return this.defaultTheme_;
  }

  return null;
};


/**
 * Get the default theme from user functionalities.
 * @return {?string} default theme name.
 * @export
 */
gmf.permalink.Permalink.prototype.defaultThemeNameFromFunctionalities = function() {
  //check if we have a theme in the user functionalities
  if (!this.gmfUser_) {
    return null;
  }
  const functionalities = this.gmfUser_.functionalities;
  if (functionalities && 'default_theme' in functionalities) {
    const defaultTheme = functionalities.default_theme;
    if (defaultTheme.length > 0) {
      return defaultTheme[0];
    }
  }
  return null;
};


/**
 * @private
 */
gmf.permalink.Permalink.prototype.initLayers_ = function() {
  if (!this.gmfThemes_) {
    return;
  }
  this.gmfThemes_.getThemesObject().then((themes) => {
    const themeName = this.defaultThemeName();
    goog.asserts.assert(themeName !== null);

    if (this.gmfThemeManager_) {
      this.gmfThemeManager_.setThemeName(this.gmfThemeManager_.modeFlush ? themeName : '');
    }

    /**
     * @type {Array<(gmfThemes.GmfGroup)>}
     */
    let firstLevelGroups = [];
    let theme;
    // Check if we have the groups in the permalink
    const groupsNames = this.ngeoLocation_.getParam(gmf.PermalinkParam.TREE_GROUPS);
    if (groupsNames === undefined) {
      goog.asserts.assertString(themeName);
      theme = gmf.theme.Themes.findThemeByName(themes, themeName);
      if (theme) {
        firstLevelGroups = theme.children;
      }
    } else {
      groupsNames.split(',').forEach((groupName) => {
        const group = gmf.theme.Themes.findGroupByName(themes, groupName);
        if (group) {
          firstLevelGroups.push(group);
        }
      });
    }

    if (this.gmfTreeManager_) {
      this.gmfTreeManager_.setFirstLevelGroups(firstLevelGroups);
    }

    this.$timeout_(() => {
      if (!this.gmfTreeManager_ || !this.gmfTreeManager_.rootCtrl) {
        // we don't have any layertree
        return;
      }
      // Enable the layers and set the opacity
      this.gmfTreeManager_.rootCtrl.traverseDepthFirst((treeCtrl) => {
        if (treeCtrl.isRoot) {
          return;
        }

        const opacity = this.ngeoStateManager_.getInitialNumberValue((
          treeCtrl.parent.node.mixed ?
            gmf.permalink.Permalink.ParamPrefix.TREE_OPACITY :
            gmf.permalink.Permalink.ParamPrefix.TREE_GROUP_OPACITY
        ) + treeCtrl.node.name);
        if (opacity !== undefined && treeCtrl.layer) {
          treeCtrl.layer.setOpacity(opacity);
        }
        if (treeCtrl.parent.node && treeCtrl.parent.node.mixed && treeCtrl.node.children == undefined) {
          // Layer of a mixed group
          const enable = this.ngeoStateManager_.getInitialBooleanValue(
            gmf.permalink.Permalink.ParamPrefix.TREE_ENABLE + treeCtrl.node.name
          );
          if (enable !== undefined) {
            treeCtrl.setState(enable ? 'on' : 'off', false);
          }
        } else if (!treeCtrl.node.mixed && treeCtrl.depth == 1) {
          // First level non mixed group
          const groupLayers = this.ngeoStateManager_.getInitialStringValue(
            gmf.permalink.Permalink.ParamPrefix.TREE_GROUP_LAYERS + treeCtrl.node.name
          );
          if (groupLayers !== undefined) {
            const groupLayersArray = groupLayers.split(',');
            treeCtrl.traverseDepthFirst((treeCtrl) => {
              if (treeCtrl.node.children === undefined) {
                const enable = ol.array.includes(groupLayersArray, treeCtrl.node.name);
                treeCtrl.setState(enable ? 'on' : 'off', false);
              }
            });
          }
        }
      });
      const firstParents = this.gmfTreeManager_.rootCtrl.children;
      firstParents.forEach((firstParent) => {
        firstParent.traverseDepthFirst((treeCtrl) => {
          if (treeCtrl.getState() !== 'indeterminate') {
            this.rootScope_.$broadcast('ngeo-layertree-state', treeCtrl, firstParent);
            return ngeo.layertree.Controller.VisitorDecision.STOP;
          }
        });
      });
    });
  });
};


// === ngeoFeatures, A.K.A features from the DrawFeature, RedLining  ===


/**
 * @param {ol.Collection.Event} event Collection event.
 * @private
 */
gmf.permalink.Permalink.prototype.handleNgeoFeaturesAdd_ = function(event) {
  const feature = event.element;
  goog.asserts.assertInstanceof(feature, ol.Feature);
  this.addNgeoFeature_(feature);
};


/**
 * @param {ol.Collection.Event} event Collection event.
 * @private
 */
gmf.permalink.Permalink.prototype.handleNgeoFeaturesRemove_ = function(event) {
  const feature = event.element;
  goog.asserts.assertInstanceof(feature, ol.Feature);
  this.removeNgeoFeature_(feature);
};


/**
 * Listen to any changes that may occur within the feature in order to
 * update the state of the permalink accordingly.
 * @param {ol.Feature} feature Feature.
 * @private
 */
gmf.permalink.Permalink.prototype.addNgeoFeature_ = function(feature) {
  const uid = ol.getUid(feature);
  this.ngeoEventHelper_.addListenerKey(
    uid,
    ol.events.listen(feature, 'change',
      this.ngeoDebounce_(this.handleNgeoFeaturesChange_, 250, true), this)
  );
};


/**
 * Unregister any event listener from the feature.
 * @param {ol.Feature} feature Feature.
 * @private
 */
gmf.permalink.Permalink.prototype.removeNgeoFeature_ = function(feature) {
  const uid = ol.getUid(feature);
  this.ngeoEventHelper_.clearListenerKey(uid);
  this.handleNgeoFeaturesChange_();
};


/**
 * Called once upon initialization of the permalink service if there's at
 * least one feature in the ngeoFeatures collection, then called every time
 * the collection changes or any of the features within the collection changes.
 * @private
 */
gmf.permalink.Permalink.prototype.handleNgeoFeaturesChange_ = function() {
  if (!this.ngeoFeatures_) {
    return;
  }
  const features = this.ngeoFeatures_.getArray();
  const data = this.featureHashFormat_.writeFeatures(features);

  const object = {};
  object[gmf.PermalinkParam.FEATURES] = data;
  this.ngeoStateManager_.updateState(object);
};


/**
 * Get the query data for a WFS permalink.
 * @return {?ngeox.WfsPermalinkData} The query data.
 * @private
 */
gmf.permalink.Permalink.prototype.getWfsPermalinkData_ = function() {
  const wfsLayer = this.ngeoLocation_.getParam(gmf.PermalinkParam.WFS_LAYER);
  if (!wfsLayer) {
    return null;
  }

  const numGroups = this.ngeoLocation_.getParamAsInt(gmf.PermalinkParam.WFS_NGROUPS);
  const paramKeys = this.ngeoLocation_.getParamKeysWithPrefix(gmf.permalink.Permalink.ParamPrefix.WFS);

  const filterGroups = [];
  let filterGroup;
  if (numGroups === undefined) {
    // no groups are used, e.g. '?wfs_layer=fuel&wfs_osm_id=123
    filterGroup = this.createFilterGroup_(gmf.permalink.Permalink.ParamPrefix.WFS, paramKeys);
    if (filterGroup !== null) {
      filterGroups.push(filterGroup);
    }
  } else {
    // filter groups are used, e.g. '?wfs_layer=osm_scale&wfs_ngroups=2&wfs_0_ele=380&
    // wfs_0_highway=bus_stop&&wfs_1_name=Grand-Pont'
    for (let i = 0; i < numGroups; i++) {
      filterGroup = this.createFilterGroup_(`${gmf.permalink.Permalink.ParamPrefix.WFS + i}_`, paramKeys);
      if (filterGroup !== null) {
        filterGroups.push(filterGroup);
      }
    }
  }

  if (filterGroups.length == 0) {
    return null;
  }

  const showFeaturesParam = this.ngeoLocation_.getParam(gmf.PermalinkParam.WFS_SHOW_FEATURES);
  const showFeatures = !(showFeaturesParam === '0' || showFeaturesParam === 'false');

  return {
    wfsType: wfsLayer,
    showFeatures: showFeatures,
    filterGroups: filterGroups
  };
};


/**
 * Create a filter group for a given prefix from the query params.
 * @param {string} prefix E.g. `wfs_` or `wfs_0_`.
 * @param {Array.<string>} paramKeys All param keys starting with `wfs_`.
 * @return {ngeox.WfsPermalinkFilterGroup|null} A filter group.
 * @private
 */
gmf.permalink.Permalink.prototype.createFilterGroup_ = function(prefix, paramKeys) {
  /**
   * @type {Array.<ngeox.WfsPermalinkFilter>}
   */
  const filters = [];

  paramKeys.forEach((paramKey) => {
    if (paramKey == gmf.PermalinkParam.WFS_LAYER || paramKey == gmf.PermalinkParam.WFS_SHOW_FEATURES ||
        paramKey == gmf.PermalinkParam.WFS_NGROUPS || paramKey.indexOf(prefix) != 0) {
      return;
    }
    const value = this.ngeoLocation_.getParam(paramKey);
    if (!value) {
      return;
    }

    let condition = value;
    if (value.indexOf(',') > -1) {
      condition = value.split(',');
    }

    const filter = {
      property: paramKey.replace(prefix, ''),
      condition: condition
    };
    filters.push(filter);
  });

  return (filters.length > 0) ? {filters} : null;
};


// === External Data Sources management ===


/**
 * @return {!angular.$q.Promise} Promise
 * @private
 */

gmf.permalink.Permalink.prototype.initExternalDataSources_ = function() {

  const ngeoQuerent = goog.asserts.assert(this.ngeoQuerent_);
  const gmfExtDSManager = goog.asserts.assert(
    this.gmfExternalDataSourcesManager_);

  const promises = [];

  const layerNamesString = this.ngeoStateManager_.getInitialValue(
    gmf.PermalinkParam.EXTERNAL_DATASOURCES_NAMES);
  const urlsString = this.ngeoStateManager_.getInitialValue(
    gmf.PermalinkParam.EXTERNAL_DATASOURCES_URLS);

  if (layerNamesString && urlsString) {

    const layerNames = layerNamesString.split(gmf.permalink.Permalink.ExtDSSeparator.LIST);
    const urls = urlsString.split(gmf.permalink.Permalink.ExtDSSeparator.LIST);

    for (let i = 0, ii = urls.length; i < ii; i++) {
      // Stop iterating if we do not have the same number of urls and layer
      // names
      const groupLayerNamesString = layerNames[i];

      if (!groupLayerNamesString) {
        break;
      }

      const groupLayerNames = groupLayerNamesString.split(
        gmf.permalink.Permalink.ExtDSSeparator.NAMES);
      const url = urls[i];

      const serviceType = ngeo.datasource.OGC.guessServiceTypeByUrl(url);

      const getCapabilitiesDefer = this.q_.defer();
      promises.push(getCapabilitiesDefer.promise);

      if (serviceType === ngeo.datasource.OGC.Type.WMS) {
        ngeoQuerent.wmsGetCapabilities(url).then(
          (capabilities) => {
            getCapabilitiesDefer.resolve({
              capabilities,
              groupLayerNames,
              serviceType,
              url
            });
          },
          () => {
            // Query to the WMS service didn't work
            getCapabilitiesDefer.reject({
              groupLayerNames,
              serviceType,
              url
            });
          }
        );
      } else if (serviceType === ngeo.datasource.OGC.Type.WMTS) {
        ngeoQuerent.wmtsGetCapabilities(url).then(
          (capabilities) => {
            getCapabilitiesDefer.resolve({
              capabilities,
              groupLayerNames,
              serviceType,
              url
            });
          },
          () => {
            // Query to the WMTS service didn't work
            getCapabilitiesDefer.reject({
              groupLayerNames,
              serviceType,
              url
            });
          }
        );
      } else {
        // Wrong service type
        getCapabilitiesDefer.reject({
          groupLayerNames,
          serviceType,
          url
        });
      }
    }
  }

  return this.q_.all(promises).then(
    (responses) => {
      for (const response of responses) {

        // WMS - For each layer name, find its layer capability object, then
        //       create the data source
        if (response.serviceType === ngeo.datasource.OGC.Type.WMS) {
          for (const layerName of response.groupLayerNames) {
            const layerCap = ngeoQuerent.wmsFindLayerCapability(
              response.capabilities['Capability']['Layer']['Layer'],
              layerName
            );
            if (layerCap) {
              gmfExtDSManager.createAndAddDataSourceFromWMSCapability(
                layerCap,
                response.capabilities,
                response.url
              );
            } else {
              // TODO - handle 'not found' layer in capabilities
            }
          }

        } else if (response.serviceType === ngeo.datasource.OGC.Type.WMTS) {

          // WMTS - For each layer name, find its layer capability object, then
          //        create the data source
          for (const layerName of response.groupLayerNames) {
            const layerCap = ngeoQuerent.wmtsFindLayerCapability(
              response.capabilities['Contents']['Layer'],
              layerName
            );
            if (layerCap) {
              gmfExtDSManager.createAndAddDataSourceFromWMTSCapability(
                layerCap,
                response.capabilities,
                response.url
              );
            } else {
              // TODO - handle 'not found' layer in capabilities
            }
          }
        }
      }
    },
    (rejections) => {
      // TODO - handle rejections
    }
  );
};


/**
 * @param {!ol.Collection.Event} evt Collection event.
 * @private
 */
gmf.permalink.Permalink.prototype.handleExternalDSGroupCollectionAdd_ = function(evt) {
  const group = evt.element;
  goog.asserts.assertInstanceof(group, ngeo.datasource.Group);
  this.registerExternalDSGroup_(group);
  this.setExternalDataSourcesState_();
};


/**
 * @param {!ngeo.datasource.Group} group Data source group.
 * @private
 */
gmf.permalink.Permalink.prototype.registerExternalDSGroup_ = function(group) {
  ol.events.listen(
    group.dataSourcesCollection,
    'add',
    this.setExternalDataSourcesState_,
    this
  );
  ol.events.listen(
    group.dataSourcesCollection,
    'remove',
    this.setExternalDataSourcesState_,
    this
  );
};


/**
 * Contains the layer name
 * @param {!ol.layer.Base} layer The layer to inspect
 * @param {string} name The layer name to find
 * @return {boolean} The containing status
 */
gmf.permalink.Permalink.prototype.containsLayerName = function(layer, name) {
  if (layer instanceof ol.layer.Group) {
    for (const l of layer.getLayers().getArray()) {
      goog.asserts.assert(l);
      if (this.containsLayerName(l, name)) {
        return true;
      }
    }
    return false;
  } else {
    return layer.get('layerNodeName') == name;
  }
};


/**
 * @param {!ol.Collection.Event} evt Collection event.
 * @private
 */
gmf.permalink.Permalink.prototype.handleExternalDSGroupCollectionRemove_ = function(evt) {
  const group = evt.element;
  goog.asserts.assertInstanceof(group, ngeo.datasource.Group);
  this.unregisterExternalDSGroup_(group);
  this.setExternalDataSourcesState_();
};


/**
 * @param {!ngeo.datasource.Group} group Data source group.
 * @private
 */
gmf.permalink.Permalink.prototype.unregisterExternalDSGroup_ = function(group) {
  ol.events.unlisten(
    group.dataSourcesCollection,
    'add',
    this.setExternalDataSourcesState_,
    this
  );
  ol.events.unlisten(
    group.dataSourcesCollection,
    'remove',
    this.setExternalDataSourcesState_,
    this
  );
};


/**
 * Set the External Data Sources parameters in the url.
 * @private
 */
gmf.permalink.Permalink.prototype.setExternalDataSourcesState_ = function() {

  if (this.setExternalDataSourcesStatePromise_) {
    this.$timeout_.cancel(this.setExternalDataSourcesStatePromise_);
  }

  this.setExternalDataSourcesStatePromise_ = this.$timeout_(() => {
    const names = [];
    const urls = [];

    // (1) Collect WMS Groups and their layer names
    for (const wmsGroup of this.gmfExternalDataSourcesManager_.wmsGroups) {

      // (1a) url
      urls.push(wmsGroup.url);

      // (1b) layer names
      const wmsGroupLayerNames = [];
      for (const wmsDataSource of wmsGroup.dataSources) {
        goog.asserts.assertInstanceof(wmsDataSource, ngeo.datasource.OGC);

        // External WMS data sources always have only one OGC layer name,
        // as they are created using a single Capability Layer object that
        // has only 1 layer name
        const layerName = wmsDataSource.getOGCLayerNames()[0];
        wmsGroupLayerNames.push(layerName);
      }
      names.push(wmsGroupLayerNames.join(gmf.permalink.Permalink.ExtDSSeparator.NAMES));
    }

    // (2) Collect WMTS Groups and their layer names
    for (const wmtsGroup of this.gmfExternalDataSourcesManager_.wmtsGroups) {

      // (2a) url
      urls.push(wmtsGroup.url);

      // (2b) layer names
      const wmtsGroupLayerNames = [];
      for (const wmtsDataSource of wmtsGroup.dataSources) {
        goog.asserts.assert(wmtsDataSource.wmtsLayer);
        wmtsGroupLayerNames.push(wmtsDataSource.wmtsLayer);
      }
      names.push(wmtsGroupLayerNames.join(gmf.permalink.Permalink.ExtDSSeparator.NAMES));
    }

    // (3) Update state
    this.ngeoStateManager_.updateState({
      [gmf.PermalinkParam.EXTERNAL_DATASOURCES_NAMES]: names.join(
        gmf.permalink.Permalink.ExtDSSeparator.LIST
      ),
      [gmf.PermalinkParam.EXTERNAL_DATASOURCES_URLS]: urls.join(
        gmf.permalink.Permalink.ExtDSSeparator.LIST
      )
    });

    // (4) Reset promise
    this.setExternalDataSourcesStatePromise_ = null;
  });
};


/**
 * Clean the permalink parameters
 * @param {!Array.<gmfThemes.GmfGroup>} groups firstlevel groups of the tree
 */
gmf.permalink.Permalink.prototype.cleanParams = function(groups) {
  const keys = goog.asserts.assert(this.ngeoLocation_.getParamKeys());
  for (const key of keys) {
    if (key.startsWith(gmf.permalink.Permalink.ParamPrefix.TREE_GROUP_LAYERS)) {
      const value = key.substring(gmf.permalink.Permalink.ParamPrefix.TREE_GROUP_LAYERS.length);
      for (const group of groups) {
        if (group.name == value) {
          this.ngeoStateManager_.deleteParam(key);
          break;
        }
      }
    }
    if (key.startsWith(gmf.permalink.Permalink.ParamPrefix.TREE_GROUP_OPACITY)) {
      const value = key.substring(gmf.permalink.Permalink.ParamPrefix.TREE_GROUP_OPACITY.length);
      for (const group of groups) {
        if (group.name == value) {
          this.ngeoStateManager_.deleteParam(key);
          break;
        }
      }
    }
  }
  this.$timeout_(() => {
    if (!this.map_) {
      return;
    }
    const layer = this.map_.getLayerGroup();
    goog.asserts.assert(layer);
    for (const key of keys) {
      if (key.startsWith(gmf.permalink.Permalink.ParamPrefix.TREE_ENABLE)) {
        const value = key.substring(gmf.permalink.Permalink.ParamPrefix.TREE_ENABLE.length);
        if (!this.containsLayerName(layer, value)) {
          this.ngeoStateManager_.deleteParam(key);
        }
      }
      if (key.startsWith(gmf.permalink.Permalink.ParamPrefix.TREE_OPACITY)) {
        const value = key.substring(gmf.permalink.Permalink.ParamPrefix.TREE_OPACITY.length);
        if (!this.containsLayerName(layer, value)) {
          this.ngeoStateManager_.deleteParam(key);
        }
      }
    }
  });
};


gmf.permalink.Permalink.module = angular.module('gmfPermalink', [
  ngeo.statemanager.module.name,
  gmf.theme.Themes.module.name,
  gmf.theme.Manager.module.name,
  ngeo.draw.features.name,
  ngeo.misc.EventHelper.module.name,
  ngeo.layertree.Controller.module.name,
]);

gmf.module.requires.push(gmf.permalink.Permalink.module.name);

gmf.permalink.Permalink.module.service('gmfPermalink', gmf.permalink.Permalink);


/**
 * @enum {string}
 */
gmf.permalink.Permalink.OpenLayersLayerProperties = {
  OPACITY: 'opacity'
};

/**
 * @enum {string}
 */
gmf.permalink.Permalink.ParamPrefix = {
  DIMENSIONS: 'dim_',
  TREE_ENABLE: 'tree_enable_',
  TREE_GROUP_LAYERS: 'tree_group_layers_',
  TREE_GROUP_OPACITY: 'tree_group_opacity_',
  TREE_OPACITY: 'tree_opacity_',
  WFS: 'wfs_'
};


/**
 * External data source separators
 * @enum {string}
 */
gmf.permalink.Permalink.ExtDSSeparator = {
  LIST: ',',
  NAMES: ';'
};


gmf.permalink.Permalink.module.value('gmfPermalinkOptions',
  /** @type {gmfx.PermalinkOptions} */ ({}));


/** Configure the ngeo state manager */
(function() {
  const regexp = [];
  for (const key1 in gmf.permalink.Permalink.ParamPrefix) {
    regexp.push(new RegExp(`${gmf.permalink.Permalink.ParamPrefix[key1]}.*`));
  }
  for (const key2 in gmf.PermalinkParam) {
    regexp.push(new RegExp(gmf.permalink.Permalink.ParamPrefix[key2]));
  }
  ngeo.module.value('ngeoUsedKeyRegexp', regexp);
})();
