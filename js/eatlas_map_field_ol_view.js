/**
 * Show a map field using openlayers
 */

/**
 * Return the selected base map depending on the map configuration
 * @param mapConfiguration
 * @returns {*}
 */
function getOlBaseMapSource(mapConfiguration) {
	if (mapConfiguration.tile_wms_options === '' || mapConfiguration.tile_wms_options === '##OSM##') {
		return new ol.source.OSM();
	} else {
		return new ol.source.TileWMS(JSON.parse(mapConfiguration.tile_wms_options));
	}
}

/**
 * Return the center coordinates of the map depending on the map configuration
 * @param mapConfiguration
 * @returns {*[]}
 */
function getCenterCoordinates(mapConfiguration) {
	return [parseFloat(mapConfiguration.center_x), parseFloat(mapConfiguration.center_y)];
}

/**
 * Return an openlayer style object depending on the map configuration
 * @param mapConfiguration
 * @returns {ol.style.Style}
 */
function getStyle(mapConfiguration) {
	var style = {
		circle: {
			radius: 5
		},
		fill: {
			colour: 'rgba(255,255,255,0.4)'
		},
		stroke: {
			colour: '#3399CC',
			width: 1.25
		}
	};

	// set custom styles from configurations
	var customStyle = JSON.parse(mapConfiguration.style);
	if (typeof(customStyle.circle) !== 'undefined') {
		if (typeof(customStyle.circle.radius) !== 'undefined') {
			style.circle.radius = customStyle.circle.radius;
		}
	}
	if (typeof(customStyle.fill) !== 'undefined') {
		if (typeof(customStyle.fill.colour) !== 'undefined') {
			style.fill.colour = customStyle.fill.colour;
		}
	}
	if (typeof(customStyle.stroke) !== 'undefined') {
		if (typeof(customStyle.stroke.colour) !== 'undefined') {
			style.stroke.colour = customStyle.stroke.colour;
		}
		if (typeof(customStyle.stroke.width) !== 'undefined') {
			style.stroke.width = customStyle.stroke.width;
		}
	}

	var fill = new ol.style.Fill({
		color: style.fill.colour
	});
	var stroke = new ol.style.Stroke({
		color: style.stroke.colour,
		width: style.stroke.width
	});
	return new ol.style.Style({
		image: new ol.style.Circle({
			fill: fill,
			stroke: stroke,
			radius: style.circle.radius
		}),
		fill: fill,
		stroke: stroke
	});
}


(function ($) {

	$(document).ready(function () {
		var geoJsonWriter = new ol.format.GeoJSON();

		$('.eatlas_map_field_map').each(function () {
			var geoJson = $(this).data('map-field-geo-json');
			var mapConfiguration = $(this).data('map-configuration');

			// define dimensions of map
			var aspectRatio = mapConfiguration.aspect_ratio.split(':');
			var height = $(this).width() * aspectRatio[1] / aspectRatio[0];
			$(this).height(height);

			var raster = new ol.layer.Tile({
				source: getOlBaseMapSource(mapConfiguration)
			});

			var source = new ol.source.Vector({
				format: new ol.format.GeoJSON(),
				features: geoJsonWriter.readFeatures(geoJson)
			});

			var vector = new ol.layer.Vector({
				source: source,
				style: getStyle(mapConfiguration)
			});

			var map = new ol.Map({
				layers: [raster, vector],
				target: $(this)[0],
				view: new ol.View({
					projection: mapConfiguration.projection,
					center: getCenterCoordinates(mapConfiguration),
					zoom: mapConfiguration.zoom_level
				})
			});
		});
	});
}(jQuery));