/**
 * Show a map field using openlayers
 */
(function ($) {
	$(document).ready(function () {
		var geoJsonWriter = new ol.format.GeoJSON();

		$('.eatlas_map_field_map').each(function () {
			var geoJsonObject = $(this).data('map-field-geo-json');

			var raster = new ol.layer.Tile({
				source: new ol.source.OSM()
			});

			var source = new ol.source.Vector({
				format: new ol.format.GeoJSON(),
				features: geoJsonWriter.readFeatures(geoJsonObject)
			});

			var vector = new ol.layer.Vector({
				source: source
			});

			new ol.Map({
				layers: [raster, vector],
				target: $(this)[0],
				view: new ol.View({
					projection: 'EPSG:3857',
					center: [15000000, -3350000],
					zoom: 2
				})
			});

		});
	});
}(jQuery));