goog.provide('ngeo.editing.createfeatureComponent');

goog.require('goog.asserts');
goog.require('ngeo');
goog.require('ngeo.misc.filters');
goog.require('ngeo.GeometryType');
goog.require('ngeo.interaction.MeasureArea');
goog.require('ngeo.interaction.MeasureLength');
goog.require('ngeo.misc.EventHelper');
goog.require('ngeo.utils');
goog.require('ol');
goog.require('ol.Collection');
goog.require('ol.events');
goog.require('ol.Feature');
goog.require('ol.interaction.Draw');
goog.require('ol.style.Style');


ngeo.editing.createfeatureComponent = angular.module('ngeoCreatefeature', [
  ngeo.misc.EventHelper.module.name,
  ngeo.misc.filters.name,
]);

ngeo.module.requires.push(ngeo.editing.createfeatureComponent.name);


/**
 * A directive used to draw vector features of a single geometry type using
 * either a 'draw' or 'measure' interaction. Once a feature is finished being
 * drawn, it is added to a collection of features.
 *
 * The geometry types supported are:
 *  - Point
 *  - LineString
 *  - Polygon
 *
 * Example:
 *
 *     <a
 *       href
 *       translate
 *       ngeo-btn
 *       ngeo-createfeature
 *       ngeo-createfeature-active="ctrl.createPointActive"
 *       ngeo-createfeature-features="ctrl.features"
 *       ngeo-createfeature-geom-type="ctrl.pointGeomType"
 *       ngeo-createfeature-map="::ctrl.map"
 *       class="btn btn-default ngeo-createfeature-point"
 *       ng-class="{active: ctrl.createPointActive}"
 *       ng-model="ctrl.createPointActive">
 *     </a>
 *
 * @htmlAttribute {boolean} ngeo-createfeature-active Whether the directive is
 *     active or not.
 * @htmlAttribute {ol.Collection} ngeo-createfeature-features The collection of
 *     features where to add those created by this directive.
 * @htmlAttribute {string} ngeo-createfeature-geom-type Determines the type
 *     of geometry this directive should draw.
 * @htmlAttribute {ol.Map} ngeo-createfeature-map The map.
 *
 * @return {angular.Directive} The directive specs.
 * @ngdoc directive
 * @ngname ngeoCreatefeature
 */
ngeo.editing.createfeatureComponent.directive_ = function() {
  return {
    controller: 'ngeoCreatefeatureController',
    bindToController: true,
    scope: {
      'active': '=ngeoCreatefeatureActive',
      'features': '=ngeoCreatefeatureFeatures',
      'geomType': '=ngeoCreatefeatureGeomType',
      'map': '=ngeoCreatefeatureMap'
    }
  };
};

ngeo.editing.createfeatureComponent.directive('ngeoCreatefeature', ngeo.editing.createfeatureComponent.directive_);


/**
 * @param {!angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {!angular.$compile} $compile Angular compile service.
 * @param {!angular.$filter} $filter Angular filter
 * @param {!angular.Scope} $scope Scope.
 * @param {!angular.$timeout} $timeout Angular timeout service.
 * @param {!ngeo.misc.EventHelper} ngeoEventHelper Ngeo event helper service
 * @constructor
 * @private
 * @struct
 * @ngInject
 * @ngdoc controller
 * @ngname ngeoCreatefeatureController
 */
ngeo.editing.createfeatureComponent.Controller_ = function(gettextCatalog, $compile, $filter, $scope,
  $timeout, ngeoEventHelper) {

  /**
   * @type {boolean}
   * @export
   */
  this.active;

  /**
   * @type {ol.Collection.<!ol.Feature>|!ol.source.Vector}
   * @export
   */
  this.features;

  /**
   * @type {string}
   * @export
   */
  this.geomType;

  /**
   * @type {!ol.Map}
   * @export
   */
  this.map;

  /**
   * @type {!angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = gettextCatalog;

  /**
   * @type {!angular.$compile}
   * @private
   */
  this.compile_ = $compile;

  /**
   * @type {!angular.$filter}
   * @private
   */
  this.filter_ = $filter;

  /**
   * @type {!angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {!angular.$timeout}
   * @private
   */
  this.timeout_ = $timeout;

  /**
   * @type {!ngeo.misc.EventHelper}
   * @private
   */
  this.ngeoEventHelper_ = ngeoEventHelper;

  /**
   * The draw or measure interaction responsible of drawing the vector feature.
   * The actual type depends on the geometry type.
   * @type {ol.interaction.Interaction}
   * @private
   */
  this.interaction_;


  // == Event listeners ==
  $scope.$watch(
    () => this.active,
    (newVal) => {
      this.interaction_.setActive(newVal);
    }
  );
};


/**
 * Initialize the directive.
 */
ngeo.editing.createfeatureComponent.Controller_.prototype.$onInit = function() {
  this.active = this.active === true;
  const gettextCatalog = this.gettextCatalog_;

  // Create the draw or measure interaction depending on the geometry type
  let interaction;
  if (this.geomType === ngeo.GeometryType.POINT ||
      this.geomType === ngeo.GeometryType.MULTI_POINT
  ) {
    interaction = new ol.interaction.Draw({
      type: /** @type {ol.geom.GeometryType} */ ('Point')
    });
  } else if (this.geomType === ngeo.GeometryType.LINE_STRING ||
      this.geomType === ngeo.GeometryType.MULTI_LINE_STRING
  ) {
    const helpMsg = gettextCatalog.getString('Click to start drawing length');
    const contMsg = gettextCatalog.getString(
      'Click to continue drawing<br/>' +
      'Double-click or click last point to finish'
    );

    interaction = new ngeo.interaction.MeasureLength(
      this.filter_('ngeoUnitPrefix'),
      {
        style: new ol.style.Style(),
        startMsg: this.compile_(`<div translate>${helpMsg}</div>`)(this.scope_)[0],
        continueMsg: this.compile_(`<div translate>${contMsg}</div>`)(this.scope_)[0]
      }
    );
  } else if (this.geomType === ngeo.GeometryType.POLYGON ||
      this.geomType === ngeo.GeometryType.MULTI_POLYGON
  ) {
    const helpMsg = gettextCatalog.getString('Click to start drawing area');
    const contMsg = gettextCatalog.getString(
      'Click to continue drawing<br/>' +
      'Double-click or click starting point to finish'
    );

    interaction = new ngeo.interaction.MeasureArea(
      this.filter_('ngeoUnitPrefix'),
      {
        style: new ol.style.Style(),
        startMsg: this.compile_(`<div translate>${helpMsg}</div>`)(this.scope_)[0],
        continueMsg: this.compile_(`<div translate>${contMsg}</div>`)(this.scope_)[0]
      }
    );
  }

  goog.asserts.assert(interaction);

  interaction.setActive(this.active);
  this.interaction_ = interaction;
  this.map.addInteraction(interaction);

  const uid = ol.getUid(this);
  if (interaction instanceof ol.interaction.Draw) {
    this.ngeoEventHelper_.addListenerKey(
      uid,
      ol.events.listen(
        interaction,
        'drawend',
        this.handleDrawEnd_,
        this
      )
    );
  } else if (interaction instanceof ngeo.interaction.MeasureLength ||
     interaction instanceof ngeo.interaction.MeasureArea) {
    this.ngeoEventHelper_.addListenerKey(
      uid,
      ol.events.listen(
        interaction,
        'measureend',
        this.handleDrawEnd_,
        this
      )
    );
  }
};


/**
 * Called when a feature is finished being drawn. Add the feature to the
 * collection.
 * @param {ol.interaction.Draw.Event|ngeox.MeasureEvent} event Event.
 * @export
 */
ngeo.editing.createfeatureComponent.Controller_.prototype.handleDrawEnd_ = function(event) {
  let sketch;
  if (event.feature) {
    // ol.interaction.Draw.Event
    sketch = event.feature;
  } else {
    // ngeox.MeasureEvent
    sketch = event.detail.feature;
  }
  goog.asserts.assert(sketch);

  // convert to multi if geomType is multi and feature is not
  let geometry = sketch.getGeometry();
  const type = geometry.getType();
  if (this.geomType.indexOf('Multi') != type.indexOf('Multi')) {
    geometry = ngeo.utils.toMulti(geometry);
  }
  const feature = new ol.Feature(geometry);
  if (this.features instanceof ol.Collection) {
    this.features.push(feature);
  } else {
    this.features.addFeature(feature);
  }
};


/**
 * Cleanup event listeners and remove the interaction from the map.
 */
ngeo.editing.createfeatureComponent.Controller_.prototype.$onDestroy = function() {
  this.timeout_(() => {
    const uid = ol.getUid(this);
    this.ngeoEventHelper_.clearListenerKey(uid);
    this.interaction_.setActive(false);
    this.map.removeInteraction(this.interaction_);
  }, 0);
};

ngeo.editing.createfeatureComponent.controller('ngeoCreatefeatureController', ngeo.editing.createfeatureComponent.Controller_);
