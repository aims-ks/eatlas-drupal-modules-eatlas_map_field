/**
 * Provide an editable map for creating an overview map
 */
(function ($) {
	$(document).ready(function () {
		var geoJsonWriter = new ol.format.GeoJSON();

		var raster = new ol.layer.Tile({
			source: new ol.source.OSM()
		});

		var source = new ol.source.Vector({
			format: new ol.format.GeoJSON()
		});

		var vector = new ol.layer.Vector({
			source: source
		});

		var map = new ol.Map({
			layers: [raster, vector],
			target: 'eatlas-map-field-map',
			view: new ol.View({
				center: [15000000, -3350000],
				zoom: 4
			})
		});

		var geoJsonTextField = $(map.getTargetElement()).closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea');
		if (geoJsonTextField.val()) {
			source.addFeatures(geoJsonWriter.readFeatures(geoJsonTextField.val()));
		}

		var draw = new ol.interaction.Draw({
			source: source,
			type: 'Polygon'
		});
		map.addInteraction(draw);

		var modify = new ol.interaction.Modify({
			source: source
		});
		map.addInteraction(modify);

		var snap = new ol.interaction.Snap({
			source: source
		});
		map.addInteraction(snap);

		vector.on('change', function (map, source) {
			return function (event) {
				console.log(source);
				geoJsonTextField.val(geoJsonWriter.writeFeatures(source.getFeatures()));
				return true;
			};
		}(map, source));

	});
}(jQuery));