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
	eatlasMapFieldApp.$imageBlobTextField = null;
	eatlasMapFieldApp.geoJsonWriter = null;
	eatlasMapFieldApp.map = {};
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
		eatlasMapFieldApp.$geoJsonTextField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea-geoJson');
		eatlasMapFieldApp.$imageBlobTextField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea-imageBlob');
		eatlasMapFieldApp.geoJsonWriter = new ol.format.GeoJSON();

		// set up the map
		var raster = new ol.layer.Tile({
			source: new ol.source.OSM()
		});

		eatlasMapFieldApp.source = new ol.source.Vector({
			format: new ol.format.GeoJSON()
		});
		eatlasMapFieldApp.loadFeatures(eatlasMapFieldApp.source);

		eatlasMapFieldApp.vector = new ol.layer.Vector({
			name: 'eatlasMapVectorLayer',
			source: eatlasMapFieldApp.source,
			wrapX: false
		});

		eatlasMapFieldApp.map = new ol.Map({
			layers: [raster, eatlasMapFieldApp.vector],
			target: 'eatlas-map-field-map',
			view: new ol.View({
				projection: 'EPSG:3857',
				center: [15000000, -3350000],
				zoom: 4
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
	 * Read GeoJson from text area and add it to source
	 * @param source
	 */
	eatlasMapFieldApp.loadFeatures = function(source) {
		// load existing features

		if (eatlasMapFieldApp.$geoJsonTextField.val()) {
			source.addFeatures(eatlasMapFieldApp.geoJsonWriter.readFeatures(eatlasMapFieldApp.$geoJsonTextField.val()));
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
	};

	/**
	 * Add custom controls to map
	 * - edit keywords button
	 */
	eatlasMapFieldApp.addCustomControls = function() {
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
	 * Show overlay with text fields for keywords
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
		var raster = new ol.layer.Tile({
			source: new ol.source.OSM()
		});

		var source = new ol.source.Vector({
			format: new ol.format.GeoJSON()
		});
		eatlasMapFieldApp.loadFeatures(source);

		var vector = new ol.layer.Vector({
			name: 'eatlasMapVectorLayerExport',
			source: source,
			wrapX: false
		});

		var map = new ol.Map({
			layers: [raster, vector],
			target: 'eatlas-map-field-map-export',
			view: new ol.View({
				projection: 'EPSG:3857',
				center: [15000000, -3350000],
				zoom: 4
			})
		});

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