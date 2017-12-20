/**
 * Provide an editable map for creating an overview map
 */
(function ($) {
	/**
	 * Define a namespace for the application.
	 */
	window.eatlasMapFieldApp = {};
	var eatlasMapFieldApp = window.eatlasMapFieldApp;
	eatlasMapFieldApp.map = {};
	eatlasMapFieldApp.source = {};
	eatlasMapFieldApp.vector = {};
	eatlasMapFieldApp.select = {};

	/**
	 * Initialise the source, vector and map
	 */
	eatlasMapFieldApp.init = function() {
		var raster = new ol.layer.Tile({
			source: new ol.source.OSM()
		});

		eatlasMapFieldApp.source = new ol.source.Vector({
			format: new ol.format.GeoJSON()
		});

		eatlasMapFieldApp.vector = new ol.layer.Vector({
			name: 'eatlasMapVectorLayer',
			source: eatlasMapFieldApp.source,
			wrapX: false
		});

		eatlasMapFieldApp.map = new ol.Map({
			layers: [raster, eatlasMapFieldApp.vector],
			target: 'eatlas-map-field-map',
			view: new ol.View({
				center: [15000000, -3350000],
				zoom: 4
			})
		});

		eatlasMapFieldApp.map.on('keydown', function(event) {
			if (event.originalEvent.key === 'Delete') {
				var selectedFeatures = eatlasMapFieldApp.select.getFeatures();
				if (selectedFeatures.getLength() > 0) {
					selectedFeatures.forEach(function(feature) {
						// check if feature exists in layer (otherwise it throws an error)
						found = eatlasMapFieldApp.source.getFeatures().some(function(originalFeature) {
							return originalFeature === feature;
						});
						if (found) {
							eatlasMapFieldApp.source.removeFeature(feature);
						}
					});

					// remove selection from map
					eatlasMapFieldApp.select.getFeatures().clear();
				}
			}
		})
	};

	/**
	 * Enable all interactions interaction
	 */
	eatlasMapFieldApp.enableInteractions = function() {
		var draw = new ol.interaction.Draw({
			source: eatlasMapFieldApp.source,
			type: 'Polygon'
		});
		eatlasMapFieldApp.map.addInteraction(draw);

		var modify = new ol.interaction.Modify({
			source: eatlasMapFieldApp.source
		});
		eatlasMapFieldApp.map.addInteraction(modify);

		var snap = new ol.interaction.Snap({
			source: eatlasMapFieldApp.source
		});
		eatlasMapFieldApp.map.addInteraction(snap);

		eatlasMapFieldApp.select = new ol.interaction.Select({
			condition: function(mapBrowserEvent) {
				return ol.events.condition.click(mapBrowserEvent) &&
					ol.events.condition.altKeyOnly(mapBrowserEvent);
			},
			toggleCondition: function(mapBrowserEvent) {
				return ol.events.condition.click(mapBrowserEvent) &&
					ol.events.condition.altKeyOnly(mapBrowserEvent);
			}
		});
		eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.select);
	};


	/**
	 * When DOM is ready, start map field application
	 */
	$(document).ready(function () {

		eatlasMapFieldApp.init();
		eatlasMapFieldApp.enableInteractions();

		var geoJsonWriter = new ol.format.GeoJSON();

		// load existing features
		var geoJsonTextField = $(eatlasMapFieldApp.map.getTargetElement()).closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea');
		if (geoJsonTextField.val()) {
			eatlasMapFieldApp.source.addFeatures(geoJsonWriter.readFeatures(geoJsonTextField.val()));
		}

		// write new GeoJson to text area
		eatlasMapFieldApp.vector.on('change', function (source) {
			return function (event) {
				geoJsonTextField.val(geoJsonWriter.writeFeatures(eatlasMapFieldApp.source.getFeatures()));
				return true;
			};
		}(eatlasMapFieldApp.source));
	});
}(jQuery));