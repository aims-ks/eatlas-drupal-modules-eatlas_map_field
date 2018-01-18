/**
 * Show a map field using openlayers
 */

function getOlBaseMapSource(mapConfiguration) {
	if (mapConfiguration.tile_wms_options === '' || mapConfiguration.tile_wms_options === '##OSM##') {
		return new ol.source.OSM();
	} else {
		return new ol.source.TileWMS(JSON.parse(mapConfiguration.tile_wms_options));
	}
}

function getCenterCoordinates(mapConfiguration) {
	return [parseFloat(mapConfiguration.center_x), parseFloat(mapConfiguration.center_y)];
}

(function ($) {

	$(document).ready(function () {
		var geoJsonWriter = new ol.format.GeoJSON();

		$('.eatlas_map_field_map').each(function () {
			var geoJson = $(this).data('map-field-geo-json');
			var mapConfiguration = $(this).data('map-configuration');

			var raster = new ol.layer.Tile({
				source: getOlBaseMapSource(mapConfiguration)
			});

			var source = new ol.source.Vector({
				format: new ol.format.GeoJSON(),
				features: geoJsonWriter.readFeatures(geoJson)
			});

			var vector = new ol.layer.Vector({
				source: source
			});

			new ol.Map({
				layers: [raster, vector],
				target: $(this)[0],
				view: new ol.View({
					projection: 'EPSG:3857',
					center: getCenterCoordinates(mapConfiguration),
					zoom: mapConfiguration.zoom_level
				})
			});

		});
	});
}(jQuery));