/**
 * Provide an editable map for creating an overview map
 */
(function ($) {
	/**
	 * Define a namespace for the application.
	 */
	window.eatlasMapFieldApp = {};
	var eatlasMapFieldApp = window.eatlasMapFieldApp;
	eatlasMapFieldApp.$mapContainer = null;
	eatlasMapFieldApp.map = {};
	eatlasMapFieldApp.source = {};
	eatlasMapFieldApp.vector = {};
	eatlasMapFieldApp.select = {};
	eatlasMapFieldApp.draw = {};

	/**
	 * Initialise the source, vector and map
	 */
	eatlasMapFieldApp.init = function() {
		eatlasMapFieldApp.$mapContainer = $('#eatlas-map-field-map');

		// set up the map
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

		var modify = new ol.interaction.Modify({
			source: eatlasMapFieldApp.source
		});
		eatlasMapFieldApp.map.addInteraction(modify);

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
		eatlasMapFieldApp.map.on('pointermove', function (event) {
			if (event.dragging) {
				return;
			}

			var feature = eatlasMapFieldApp.map.forEachFeatureAtPixel(
				event.pixel,
				function(feature, layer) {
					return feature;
				},
				{ layerFilter: function(layer) {
					return layer === eatlasMapFieldApp.vector
				} }
			);
			var hit = !(feature);
			eatlasMapFieldApp.draw.setActive(hit);
		});

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

		eatlasMapFieldApp.select.on('select', function() {
			console.log('eatlasMapFieldApp.select.getFeatures().getLength(): ', eatlasMapFieldApp.select.getFeatures().getLength());
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
		var keywords = typeof selectedFeature.get('keywords') !== 'undefined' ? selectedFeature.get('keywords') : { 0: '', 1: '', 2: '', 3: '', 4: '', 5: ''};

		var divEditKeywordsOverlay = document.createElement('div');
		divEditKeywordsOverlay.id = 'eatlas-map-field-edit-keywords-overlay';

		var divEditKeywordsContainer = document.createElement('div');
		divEditKeywordsContainer.id = 'eatlas-map-field-edit-keywords-container';
		divEditKeywordsOverlay.appendChild(divEditKeywordsContainer);

		var headlineEditKeywords = document.createElement('h2');
		headlineEditKeywords.innerHTML = 'Edit keywords';
		divEditKeywordsContainer.appendChild(headlineEditKeywords);

		for (var i=0; i<6; i++) {
			var inputKeyword = document.createElement('input');
			inputKeyword.className = 'inputKeyword inputKeyword-' + i;
			inputKeyword.type = 'text';
			inputKeyword.value = keywords[i];

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
			var keywords = [];
			for (var i=0; i<6; i++) {
				keywords[i] = $('.inputKeyword-' + i).val();
			}

			var selectedFeature = selectedFeatures.item(0);
			selectedFeature.set('keywords', keywords);
			// var geoJson = JSON.parse($('#edit-field-overview-map-und-0-geojson').val());
		}

		// console.log()
		var divEditKeywordsOverlay = $('#eatlas-map-field-edit-keywords-overlay').remove();
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