/**
 * Create a map field using openlayers
 */
(function ($) {
	/**
	 * Define a namespace for the application.
	 */
	window.eatlasMapFieldApp = {};
	var eatlasMapFieldApp = window.eatlasMapFieldApp;
	eatlasMapFieldApp.$mapContainer = null;
	eatlasMapFieldApp.$geoJsonTextField = null;
	eatlasMapFieldApp.$mapConfigurationsField = null;
	eatlasMapFieldApp.$imageBlobTextField = null;
	eatlasMapFieldApp.mapConfiguration = {};
	eatlasMapFieldApp.geoJsonWriter = null;
	eatlasMapFieldApp.map = {};
	eatlasMapFieldApp.raster = {};
	eatlasMapFieldApp.source = {};
	eatlasMapFieldApp.vector = {};
	eatlasMapFieldApp.select = {};
	eatlasMapFieldApp.draw = {};
	eatlasMapFieldApp.modify = {};

	/**
	 * Initialise the source, vector and map
	 */
	eatlasMapFieldApp.init = function() {
		eatlasMapFieldApp.$mapContainer = $('#eatlas-map-field-map');
		eatlasMapFieldApp.$geoJsonTextField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea-geo-json');
		eatlasMapFieldApp.$mapConfigurationsField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-select-map-conf');
		eatlasMapFieldApp.$imageBlobTextField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea-image-blob');
		eatlasMapFieldApp.geoJsonWriter = new ol.format.GeoJSON();
		eatlasMapFieldApp.mapConfiguration = eatlasMapFieldApp.getSelectedMapConfiguration();

		// set up the map
		eatlasMapFieldApp.raster = eatlasMapFieldApp.createRasterLayer();
		eatlasMapFieldApp.source = eatlasMapFieldApp.createVectorLayerSource();
		eatlasMapFieldApp.vector = eatlasMapFieldApp.createVectorLayer(eatlasMapFieldApp.source);
		eatlasMapFieldApp.map = eatlasMapFieldApp.createMap(
			eatlasMapFieldApp.raster,
			eatlasMapFieldApp.vector,
			'eatlas-map-field-map'
		);
	};

	/**
	 * Create a raster layer depending on the map configuration
	 * @returns {ol.layer.Tile}
	 */
	eatlasMapFieldApp.createRasterLayer = function() {
		return new ol.layer.Tile({
			source: eatlasMapFieldApp.mapConfiguration.getOlBaseMapSource()
		});
	};

	/**
	 * Create a new vector layer source and load existing features
	 * @returns {ol.source.Vector}
	 */
	eatlasMapFieldApp.createVectorLayerSource = function() {
		var source =  new ol.source.Vector({
			format: new ol.format.GeoJSON()
		});

		// load existing features by reading GeoJson from text area and add it to source
		if (eatlasMapFieldApp.$geoJsonTextField.val()) {
			source.addFeatures(eatlasMapFieldApp.geoJsonWriter.readFeatures(eatlasMapFieldApp.$geoJsonTextField.val()));
		}

		return source;
	};

	/**
	 * Create a new vector layer
	 * @param source
	 * @returns {ol.layer.Vector}
	 */
	eatlasMapFieldApp.createVectorLayer = function(source) {
		return new ol.layer.Vector({
			name: 'eatlasMapVectorLayer',
			source: source,
			wrapX: false
		});
	};

	/**
	 *
	 * @param rasterLayer
	 * @param vectorLayer
	 * @param target
	 * @returns {ol.Map}
	 */
	eatlasMapFieldApp.createMap = function(rasterLayer, vectorLayer, target) {
		return new ol.Map({
			layers: [rasterLayer, vectorLayer],
			target: target,
			view: new ol.View({
				projection: 'EPSG:3857',
				// center: [15000000, -3350000],
				// zoom: 4
				center: eatlasMapFieldApp.mapConfiguration.getCenterCoordinates(),
				zoom: eatlasMapFieldApp.mapConfiguration.zoom_level
			})
		});
	};

	/**
	 * initially set the map to deactivated
	 */
	eatlasMapFieldApp.deactivateMap = function() {
		if (eatlasMapFieldApp.$mapContainer.hasClass('not-editable') && $('#eatlas-map-field-map-disable').length === 0) {
			var buttonEnableEditing = document.createElement('button');
			buttonEnableEditing.innerHTML = 'Edit';
			buttonEnableEditing.type = 'button';
			buttonEnableEditing.addEventListener('click', eatlasMapFieldApp.handleEnableEditing, false);
			buttonEnableEditing.addEventListener('touchstart', eatlasMapFieldApp.handleEnableEditing, false);

			var divButtonWrapper = document.createElement('div');
			divButtonWrapper.id = 'eatlas-map-field-map-enable-button-wrapper';
			divButtonWrapper.className = 'ol-unselectable ol-control';
			divButtonWrapper.appendChild(buttonEnableEditing);

			var divEnableEditing = document.createElement('div');
			divEnableEditing.id = 'eatlas-map-field-map-disable';
			divEnableEditing.appendChild(divButtonWrapper);

			eatlasMapFieldApp.$mapContainer.parent().append(divEnableEditing);
		}
	};

	/**
	 * Enable all interactions interaction
	 */
	eatlasMapFieldApp.enableInteractions = function() {
		eatlasMapFieldApp.draw = new ol.interaction.Draw({
			source: eatlasMapFieldApp.source,
			type: 'Polygon'
		});
		eatlasMapFieldApp.draw.setActive(true);
		eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.draw);

		eatlasMapFieldApp.modify = new ol.interaction.Modify({
			source: eatlasMapFieldApp.source
		});
		eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.modify);

		var snap = new ol.interaction.Snap({
			source: eatlasMapFieldApp.source
		});
		eatlasMapFieldApp.map.addInteraction(snap);

		// use single click to select feature
		eatlasMapFieldApp.select = new ol.interaction.Select();
		eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.select);
	};

	/**
	 * Add event listener
	 * - key down "Delete"
	 * - key down "Escape"
	 */
	eatlasMapFieldApp.addEventListener = function() {
		// deactivate draw interaction when hovering over existing feature
		eatlasMapFieldApp.map.on('pointermove', function (event) {
			if (event.dragging) {
				return;
			}

			var feature = eatlasMapFieldApp.map.forEachFeatureAtPixel(
				event.pixel,
				function(feature) {
					return feature;
				},
				{
					layerFilter: function(layer) {
						return layer === eatlasMapFieldApp.vector
					}
				}
			);
			var hit = !(feature);
			eatlasMapFieldApp.draw.setActive(hit);
		});

		// write new GeoJson to text area and export map
		var vectorChangeTimeout;
		eatlasMapFieldApp.vector.on('change', function () {
			clearTimeout(vectorChangeTimeout);
			vectorChangeTimeout = setTimeout(function() {
				eatlasMapFieldApp.$geoJsonTextField.val(eatlasMapFieldApp.geoJsonWriter.writeFeatures(eatlasMapFieldApp.source.getFeatures()));
				eatlasMapFieldApp.exportMapAsImage();
			}, 100);

			return true;
		});

		// handle key board events
		eatlasMapFieldApp.map.on('keydown', function(event) {
			if (event.originalEvent.key === 'Delete') {
				// delete selected features
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
			else if (event.originalEvent.key === 'Escape') {
				eatlasMapFieldApp.draw.removeLastPoint();
			}
		});

		// show edit keywords button when one polygon is selected
		eatlasMapFieldApp.select.on('select', function() {
			if (eatlasMapFieldApp.select.getFeatures().getLength() === 1) {
				$('.edit-keywords ').show();
			} else {
				$('.edit-keywords ').hide();
			}
		});

		// reload map configuration on select change
		eatlasMapFieldApp.$mapConfigurationsField.bind('change', function() {
			// update configuration
			eatlasMapFieldApp.mapConfiguration = eatlasMapFieldApp.getSelectedMapConfiguration();

			// update base map
			eatlasMapFieldApp.raster.setSource(eatlasMapFieldApp.mapConfiguration.getOlBaseMapSource());

			// update view
			eatlasMapFieldApp.map.getView().setCenter(eatlasMapFieldApp.mapConfiguration.getCenterCoordinates());
			eatlasMapFieldApp.map.getView().setZoom(eatlasMapFieldApp.mapConfiguration.zoom_level);

			eatlasMapFieldApp.map.renderSync();
		});
	};

	/**
	 * Add custom controls to map
	 * - edit keywords button
	 */
	eatlasMapFieldApp.addCustomControls = function() {
		// select geometry type
		var optionPoint = document.createElement('option');
		optionPoint.setAttribute('value', 'Point');
		optionPoint.appendChild(document.createTextNode('Point'));

		var optionPolygon = document.createElement('option');
		optionPolygon.setAttribute('value', 'Polygon');
		optionPolygon.setAttribute('selected', 'true');
		optionPolygon.appendChild(document.createTextNode('Polygon'));

		var selectGeometryType = document.createElement('select');
		selectGeometryType.appendChild(optionPoint);
		selectGeometryType.appendChild(optionPolygon);
		selectGeometryType.addEventListener('change', eatlasMapFieldApp.handleChangeGeometryType, false);

		var divGeometryType = document.createElement('div');
		divGeometryType.className = 'geometry-type ol-unselectable ol-control';
		divGeometryType.appendChild(selectGeometryType);

		eatlasMapFieldApp.$mapContainer.find('.ol-overlaycontainer-stopevent').first().append(divGeometryType);

		// edit keywords button
		var buttonEditKeywords = document.createElement('button');
		buttonEditKeywords.innerHTML = 'Edit keywords';
		buttonEditKeywords.type = 'button';
		buttonEditKeywords.addEventListener('click', eatlasMapFieldApp.handleEditKeywords, false);
		buttonEditKeywords.addEventListener('touchstart', eatlasMapFieldApp.handleEditKeywords, false);

		var divEditKeywords = document.createElement('div');
		divEditKeywords.className = 'edit-keywords ol-unselectable ol-control';
		divEditKeywords.appendChild(buttonEditKeywords);

		eatlasMapFieldApp.$mapContainer.find('.ol-overlaycontainer-stopevent').first().append(divEditKeywords);

		// download as KML button
		var buttonDownloadKML = document.createElement('button');
		buttonDownloadKML.innerHTML = 'Download KML';
		buttonDownloadKML.type = 'button';
		buttonDownloadKML.addEventListener('click', eatlasMapFieldApp.handleDownloadKML, false);
		buttonDownloadKML.addEventListener('touchstart', eatlasMapFieldApp.handleDownloadKML, false);

		var divDownloadKML = document.createElement('div');
		divDownloadKML.className = 'download-kml ol-unselectable ol-control';
		divDownloadKML.appendChild(buttonDownloadKML);

		eatlasMapFieldApp.$mapContainer.find('.ol-overlaycontainer-stopevent').first().append(divDownloadKML);
	};

	/**
	 * Change geometry type of draw interaction
	 */
	eatlasMapFieldApp.handleChangeGeometryType = function () {
		eatlasMapFieldApp.map.removeInteraction(eatlasMapFieldApp.draw);
		eatlasMapFieldApp.draw = new ol.interaction.Draw({
			source: eatlasMapFieldApp.source,
			type: $(this).val()
		});
		eatlasMapFieldApp.draw.setActive(true);
		eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.draw);
	};

	/**
	 * Remove overlay with "edit" button after clicking the button
	 * @param event
	 */
	eatlasMapFieldApp.handleEnableEditing = function(event) {
		event.preventDefault();
		$('#eatlas-map-field-map-disable').remove();
	};

	/**
	 * Show overlay with text fields for keywords
	 * @param event
	 */
	eatlasMapFieldApp.handleEditKeywords = function(event) {
		event.preventDefault();

		var selectedFeatures = eatlasMapFieldApp.select.getFeatures();
		if (selectedFeatures.getLength() !== 1) {
			return;
		}
		var selectedFeature = selectedFeatures.item(0);

		var divEditKeywordsOverlay = document.createElement('div');
		divEditKeywordsOverlay.id = 'eatlas-map-field-edit-keywords-overlay';

		var divEditKeywordsContainer = document.createElement('div');
		divEditKeywordsContainer.id = 'eatlas-map-field-edit-keywords-container';
		divEditKeywordsOverlay.appendChild(divEditKeywordsContainer);

		var headlineEditKeywords = document.createElement('h2');
		headlineEditKeywords.innerHTML = 'Edit keywords';
		divEditKeywordsContainer.appendChild(headlineEditKeywords);

		for (var i=1; i<=6; i++) {
			var keyword = typeof selectedFeature.get('keyword' + i) !== 'undefined' ? selectedFeature.get('keyword' + i) : '';
			var inputKeyword = document.createElement('input');
			inputKeyword.className = 'inputKeyword inputKeyword-' + i;
			inputKeyword.type = 'text';
			inputKeyword.value = keyword;

			divEditKeywordsContainer.appendChild(inputKeyword);
		}

		var closeButton = document.createElement('button');
		closeButton.innerHTML = 'Close';
		closeButton.addEventListener('click', eatlasMapFieldApp.handleCloseEditKeywords, false);
		divEditKeywordsContainer.appendChild(closeButton);

		eatlasMapFieldApp.$mapContainer.parent().append(divEditKeywordsOverlay);
	};

	/**
	 * Remove overlay with text fields for keywords
	 * @param event
	 */
	eatlasMapFieldApp.handleCloseEditKeywords = function(event) {
		event.preventDefault();
		var selectedFeatures = eatlasMapFieldApp.select.getFeatures();
		if (selectedFeatures.getLength() === 1) {
			var selectedFeature = selectedFeatures.item(0);
			for (var i=1; i<=6; i++) {
				selectedFeature.set('keyword' + i, $('.inputKeyword-' + i).val());
			}
		}

		$('#eatlas-map-field-edit-keywords-overlay').remove();
	};

	/**
	 * Export map as KML file for download
	 * @param event
	 */
	eatlasMapFieldApp.handleDownloadKML = function(event) {
		event.preventDefault();

		var kmlFormat = new ol.format.KML();

		var downloadLink = document.createElement('a');
		downloadLink.setAttribute('href', 'data:text/plain;charset=utf-8,' +
			encodeURIComponent(kmlFormat.writeFeatures(
				eatlasMapFieldApp.source.getFeatures(),
				{featureProjection: 'EPSG:3857'})));
		downloadLink.setAttribute('download', 'mapExport.kml');
		downloadLink.style.display = 'none';

		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
	};

		/**
	 * Export map as image
	 */
	eatlasMapFieldApp.exportMapAsImage = function() {
		var divExportMap = document.createElement('div');
		divExportMap.id = 'eatlas-map-field-map-export';
		eatlasMapFieldApp.$mapContainer.append(divExportMap);

		// set up the map
		var raster = eatlasMapFieldApp.createRasterLayer();
		var source = eatlasMapFieldApp.createVectorLayerSource();
		var vector = eatlasMapFieldApp.createVectorLayer(source);
		var map = eatlasMapFieldApp.createMap(
			raster,
			vector,
			'eatlas-map-field-map-export'
		);

		var exportMapTimeout;
		map.on('postcompose', function(event) {
			clearTimeout(exportMapTimeout);
			exportMapTimeout = setTimeout(function () {
				var canvas = event.context.canvas;

				var imgData = canvas.toDataURL();
				eatlasMapFieldApp.$imageBlobTextField.val(imgData);

				divExportMap.remove();
			}, 100);
		});
		map.renderSync();
	};

	/**
	 * Get the map configuration depending on the selected option in the select field.
	 */
	eatlasMapFieldApp.getSelectedMapConfiguration = function() {
		var selectedConfigId = eatlasMapFieldApp.$mapConfigurationsField.val();
		var configurations = eatlasMapFieldApp.$mapConfigurationsField.data('map-configurations');

		var selectedConfiguration = configurations.find(function (configuration) {
			return selectedConfigId.toString() === configuration.mid;
		});

		// map the base map key value to the openlayers sources
		selectedConfiguration.getOlBaseMapSource = function() {
			if (selectedConfiguration.tile_wms_options === '' || selectedConfiguration.tile_wms_options === '##OSM##') {
				return new ol.source.OSM();
			} else {
				return new ol.source.TileWMS(JSON.parse(selectedConfiguration.tile_wms_options));
			}
		};

		// return the coordinates for the center of the map
		selectedConfiguration.getCenterCoordinates = function() {
			return [parseFloat(this.center_x), parseFloat(this.center_y)];
		};

		return selectedConfiguration;
	};

	/**
	 * When DOM is ready, start map field application
	 */
	$(document).ready(function () {
		eatlasMapFieldApp.init();
		eatlasMapFieldApp.deactivateMap();
		eatlasMapFieldApp.enableInteractions();
		eatlasMapFieldApp.addEventListener();
		eatlasMapFieldApp.addCustomControls();
	});
}(jQuery));