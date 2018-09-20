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
  eatlasMapFieldApp.$keywordGroupField = null;
  eatlasMapFieldApp.$imageBlobTextField = null;
  eatlasMapFieldApp.$customMapConfCheckbox = null;
  eatlasMapFieldApp.$customMapConfTextField = null;
  eatlasMapFieldApp.mapConfiguration = {};
  eatlasMapFieldApp.geoJsonWriter = null;
  eatlasMapFieldApp.map = {};
  eatlasMapFieldApp.raster = {};
  eatlasMapFieldApp.source = {};
  eatlasMapFieldApp.vector = {};
  eatlasMapFieldApp.select = {};
  eatlasMapFieldApp.draw = {};
  eatlasMapFieldApp.modify = {};
  eatlasMapFieldApp.snap = {};

  /**
   * Initialise the source, vector and map
   */
  eatlasMapFieldApp.init = function () {
    // jQuery objects
    eatlasMapFieldApp.$mapContainer = $('#eatlas-map-field-map');
    eatlasMapFieldApp.$geoJsonTextField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea-geo-json');
    eatlasMapFieldApp.$mapConfigurationsField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-select-map-conf');
    eatlasMapFieldApp.$keywordGroupField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-select-keyword-group');
    eatlasMapFieldApp.$imageBlobTextField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea-image-blob');
    eatlasMapFieldApp.$customMapConfTextField = eatlasMapFieldApp.$mapContainer.closest('.field-type-eatlas-map-field').find('.edit-map-field-textarea-custom-map-configuration');

    // initialise geoJsonWriter
    eatlasMapFieldApp.geoJsonWriter = new ol.format.GeoJSON();

    // define map configuration
    eatlasMapFieldApp.mapConfiguration = eatlasMapFieldApp.getSelectedMapConfiguration();

    // define dimensions of map
    var aspectRatio = eatlasMapFieldApp.mapConfiguration.aspect_ratio.split(':');
    var height = eatlasMapFieldApp.$mapContainer.width() * aspectRatio[1] / aspectRatio[0];
    eatlasMapFieldApp.$mapContainer.height(height);

    // set up the map
    eatlasMapFieldApp.raster = eatlasMapFieldApp.createRasterLayer();
    eatlasMapFieldApp.source = eatlasMapFieldApp.createVectorLayerSource();
    eatlasMapFieldApp.vector = eatlasMapFieldApp.createVectorLayer(eatlasMapFieldApp.source);
    eatlasMapFieldApp.map = eatlasMapFieldApp.createMap(
      eatlasMapFieldApp.raster,
      eatlasMapFieldApp.vector,
      'eatlas-map-field-map'
    );

    eatlasMapFieldApp.addChangeListenerToFeatures();

    if (eatlasMapFieldApp.$customMapConfTextField.val() !== '') {
      var conf = JSON.parse(eatlasMapFieldApp.$customMapConfTextField.val());
      eatlasMapFieldApp.map.getView().setZoom(conf.zoom_level);
      eatlasMapFieldApp.map.getView().setCenter([parseFloat(conf.center_x), parseFloat(conf.center_y)]);
    }
  };

  /**
   * Create a raster layer depending on the map configuration
   * @returns {ol.layer.Tile}
   */
  eatlasMapFieldApp.createRasterLayer = function () {
    return new ol.layer.Tile({
      source: eatlasMapFieldApp.mapConfiguration.getOlBaseMapSource()
    });
  };

  /**
   * Create a new vector layer source and load existing features
   * @returns {ol.source.Vector}
   */
  eatlasMapFieldApp.createVectorLayerSource = function () {
    var source = new ol.source.Vector({
      format: eatlasMapFieldApp.geoJsonWriter
    });

    // load existing features by reading GeoJson from text area and add it to source
    if (eatlasMapFieldApp.$geoJsonTextField.val()) {
      source.addFeatures(eatlasMapFieldApp.geoJsonWriter.readFeatures(eatlasMapFieldApp.$geoJsonTextField.val()));
    }

    // set style function if custom style is selected
    source.getFeatures().forEach(function(feature) {
      eatlasMapFieldApp.setFeatureStyle(feature);
    });

    return source;
  };

  /**
   * Create a new vector layer
   * @param source
   * @returns {ol.layer.Vector}
   */
  eatlasMapFieldApp.createVectorLayer = function (source) {
    return new ol.layer.Vector({
      name: 'eatlasMapVectorLayer',
      source: source,
      style: eatlasMapFieldApp.mapConfiguration.getStyle(),
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
  eatlasMapFieldApp.createMap = function (rasterLayer, vectorLayer, target) {
    return new ol.Map({
      layers: [rasterLayer, vectorLayer],
      target: target,
      view: new ol.View({
        projection: eatlasMapFieldApp.mapConfiguration.projection,
        center: eatlasMapFieldApp.mapConfiguration.getCenterCoordinates(),
        zoom: eatlasMapFieldApp.mapConfiguration.zoom_level
      })
    });
  };

  /**
   * initially set the map to deactivated
   */
  eatlasMapFieldApp.deactivateMap = function () {
    if (eatlasMapFieldApp.$mapContainer.hasClass('not-editable') && $('#eatlas-map-field-edit-overlay').length === 0) {
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
      divEnableEditing.id = 'eatlas-map-field-edit-overlay';
      divEnableEditing.appendChild(divButtonWrapper);

      eatlasMapFieldApp.$mapContainer.append(divEnableEditing);
    }
  };

  /**
   * Enable all interactions interaction
   */
  eatlasMapFieldApp.enableInteractions = function () {
    eatlasMapFieldApp.draw = new ol.interaction.Draw({
      source: eatlasMapFieldApp.source,
      type: 'Polygon'
    });
    eatlasMapFieldApp.draw.setActive(true);
    eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.draw);

    // use single click to select feature
    eatlasMapFieldApp.select = new ol.interaction.Select();
    eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.select);

    // make selected feature editable
    eatlasMapFieldApp.modify = new ol.interaction.Modify({
      source: eatlasMapFieldApp.source
    });
    eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.modify);

    eatlasMapFieldApp.snap = new ol.interaction.Snap({
      source: eatlasMapFieldApp.source
    });
    eatlasMapFieldApp.map.addInteraction(eatlasMapFieldApp.snap);
  };

  /**
   * Add event listener
   */
  eatlasMapFieldApp.addEventListener = function () {
    // deactivate draw interaction when hovering over existing feature
    eatlasMapFieldApp.map.on('pointermove', function (event) {
      if (event.dragging) {
        return;
      }

      var feature = eatlasMapFieldApp.map.forEachFeatureAtPixel(
        event.pixel,
        function (feature) {
          return feature;
        },
        {
          layerFilter: function (layer) {
            return layer === eatlasMapFieldApp.vector
          }
        }
      );
      var hit = !(feature);
      eatlasMapFieldApp.draw.setActive(hit);
    });

    // write new GeoJson to text area and export map and update features event listeners
    var vectorChangeTimeout;
    eatlasMapFieldApp.vector.on('change', function () {
      clearTimeout(vectorChangeTimeout);
      vectorChangeTimeout = setTimeout(function () {
        eatlasMapFieldApp.$geoJsonTextField.val(eatlasMapFieldApp.geoJsonWriter.writeFeatures(eatlasMapFieldApp.source.getFeatures()));
        eatlasMapFieldApp.exportMapAsImage();
        eatlasMapFieldApp.addChangeListenerToFeatures();
      }, 100);

      return true;
    });

    // update custom map conf text area
    var mapMoveEndTimeout;
    eatlasMapFieldApp.map.on('moveend', function() {
      clearTimeout(mapMoveEndTimeout);
      mapMoveEndTimeout = setTimeout(function () {
        if (eatlasMapFieldApp.$customMapConfCheckbox.is(':checked')) {
          eatlasMapFieldApp.updateCustomMapConfTextArea();
          eatlasMapFieldApp.exportMapAsImage();
        }
      }, 100);
    });

    // handle key board events
    eatlasMapFieldApp.map.on('keydown', function (event) {
      // only listen for keydown events when the properties edit popup is not visible
      if ($('#eatlas-map-field-edit-overlay:visible').length === 0) {
        if (event.originalEvent.key === 'Delete') {
          // delete selected features
          var selectedFeatures = eatlasMapFieldApp.select.getFeatures();
          if (selectedFeatures.getLength() > 0) {
            selectedFeatures.forEach(function (selectedFeature) {
              // check if selectedFeature exists in layer (otherwise it throws an error)
              var found = eatlasMapFieldApp.source.getFeatures().some(function (feature) {
                return feature === selectedFeature;
              });
              if (found) {
                eatlasMapFieldApp.source.removeFeature(selectedFeature);
              }
            });

            // remove selection from map
            eatlasMapFieldApp.select.getFeatures().clear();
          }
        }
        else if (event.originalEvent.key === 'Escape') {
          eatlasMapFieldApp.draw.removeLastPoint();
        }
      }
    });

    // toggle buttons depending on the how many features have been selected
    eatlasMapFieldApp.select.on('select', function () {
      var selectedFeatureCnt = eatlasMapFieldApp.select.getFeatures().getLength();

      // show edit properties button when one feature is selected
      if (selectedFeatureCnt === 1) {
        $('.edit-properties').show();
      } else {
        $('.edit-properties').hide();
      }
    });

    // reload map configuration on select change
    eatlasMapFieldApp.$mapConfigurationsField.bind('change', function () {
      var prevMapConfiguration = eatlasMapFieldApp.mapConfiguration;

      // update configuration
      eatlasMapFieldApp.mapConfiguration = eatlasMapFieldApp.getSelectedMapConfiguration();

      // update base map
      eatlasMapFieldApp.raster.setSource(eatlasMapFieldApp.mapConfiguration.getOlBaseMapSource());

      // update style for vector layer
      eatlasMapFieldApp.vector.setStyle(eatlasMapFieldApp.mapConfiguration.getStyle());

      // when the map configurations have different projections transform feature coordinates
      if (prevMapConfiguration.projection !== eatlasMapFieldApp.mapConfiguration.projection) {
        eatlasMapFieldApp.source.getFeatures().forEach(function(feature) {
          feature.getGeometry().transform(prevMapConfiguration.projection, eatlasMapFieldApp.mapConfiguration.projection);
        })
      }

      // set new view with updated options
      eatlasMapFieldApp.map.setView(new ol.View({
        projection: eatlasMapFieldApp.mapConfiguration.projection,
        center: eatlasMapFieldApp.mapConfiguration.getCenterCoordinates(),
        zoom: eatlasMapFieldApp.mapConfiguration.zoom_level
      }));

      eatlasMapFieldApp.map.renderSync();
      eatlasMapFieldApp.vector.dispatchEvent('change');
    });

    // reset keywords and styles when keyword group changes
    eatlasMapFieldApp.$keywordGroupField.bind('change', function() {
      eatlasMapFieldApp.source.getFeatures().forEach(function(feature) {
        feature.unset('keywords');
        feature.unset('styleId');
        eatlasMapFieldApp.setFeatureStyle(feature);
      });
    });
  };

  /**
   * Set currently modified feature as selected and remove others
   */
  eatlasMapFieldApp.addChangeListenerToFeatures = function() {
    var featureChangeTimeout;
    eatlasMapFieldApp.source.getFeatures().forEach(function (feature) {
      feature.on('change', function (event) {
        clearTimeout(featureChangeTimeout);
        featureChangeTimeout = setTimeout(function () {
          eatlasMapFieldApp.select.getFeatures().clear();
          eatlasMapFieldApp.select.getFeatures().push(feature);
        }, 100);

        return true;
      });
    });
  };

  /**
   * Add custom controls to map
   * - select geometry type
   * - edit properties button
   * - download KML button
   * - select map configuration
   * - use custom map configuration
   */
  eatlasMapFieldApp.addCustomControls = function () {
    // interaction controls container
    var $interactionControlsContainer = $('<div class="edit-map-field-controls-container interaction"></div>');

    // select geometry type
    var optionPoint = document.createElement('option');
    optionPoint.setAttribute('value', 'Point');
    optionPoint.appendChild(document.createTextNode('Point'));

    var optionPolygon = document.createElement('option');
    optionPolygon.setAttribute('value', 'Polygon');
    optionPolygon.setAttribute('selected', 'true');
    optionPolygon.appendChild(document.createTextNode('Polygon'));

    var selectGeometryType = document.createElement('select');
    selectGeometryType.title = 'Select geometry type for drawing';
    selectGeometryType.appendChild(optionPoint);
    selectGeometryType.appendChild(optionPolygon);
    selectGeometryType.addEventListener('change', eatlasMapFieldApp.handleChangeGeometryType, false);

    var divGeometryType = document.createElement('div');
    divGeometryType.className = 'geometry-type ol-unselectable ol-control';
    divGeometryType.appendChild(selectGeometryType);

    $interactionControlsContainer.append(divGeometryType);

    // add controls container to map
    eatlasMapFieldApp.$mapContainer.find('.ol-overlaycontainer-stopevent').first().append($interactionControlsContainer);

    // map configuration controls container
    var $mapConfControlsContainer = $('<div class="edit-map-field-controls-container map-configuration"></div>');

    // use custom map configuration checkbox
    var useCustomMapConfWrapper = document.createElement('div');
    useCustomMapConfWrapper.className = 'edit-map-field-custom-map-configuration-wrapper';

    var useCustomMapConfInput = document.createElement('input');
    useCustomMapConfInput.type = "checkbox";
    useCustomMapConfInput.value = "useCurrentConf";
    useCustomMapConfInput.id = "eatlas-map-field-custom-map-configuration-checkbox";
    useCustomMapConfInput.checked = eatlasMapFieldApp.$customMapConfTextField.val() !== '';
    useCustomMapConfInput.addEventListener('change', eatlasMapFieldApp.handleChangeUseCustomMapConf, false);
    eatlasMapFieldApp.$customMapConfCheckbox = $(useCustomMapConfInput);

    var useCustomMapConfLabel = document.createElement('label');
    useCustomMapConfLabel.htmlFor = "eatlas-map-field-custom-map-configuration-checkbox";
    useCustomMapConfLabel.appendChild(document.createTextNode('Use current viewport'));

    useCustomMapConfWrapper.appendChild(useCustomMapConfInput);
    useCustomMapConfWrapper.appendChild(useCustomMapConfLabel);

    $mapConfControlsContainer.append(useCustomMapConfWrapper);

    // move map configuration select field into container
    $mapConfControlsContainer.append(eatlasMapFieldApp.$mapConfigurationsField.closest('.edit-map-field-select-map-conf-wrapper'));

    // move keyword group select field into container
    $mapConfControlsContainer.append(eatlasMapFieldApp.$keywordGroupField.closest('.edit-map-field-select-keyword-group-wrapper'));

    // add controls container to map
    eatlasMapFieldApp.$mapContainer.find('.ol-overlaycontainer-stopevent').first().append($mapConfControlsContainer);

    // buttons

    // edit properties button
    var buttonEditProperties = document.createElement('button');
    buttonEditProperties.innerHTML = 'Edit properties';
    buttonEditProperties.type = 'button';
    buttonEditProperties.addEventListener('click', eatlasMapFieldApp.handleEditProperties, false);
    buttonEditProperties.addEventListener('touchstart', eatlasMapFieldApp.handleEditProperties, false);

    var divEditProperties = document.createElement('div');
    divEditProperties.className = 'edit-properties ol-unselectable ol-control';
    divEditProperties.appendChild(buttonEditProperties);

    eatlasMapFieldApp.$mapContainer.find('.ol-overlaycontainer-stopevent').first().append(divEditProperties);

    // handle KML
    var divDownloadKML = document.createElement('div');
    divDownloadKML.className = 'handle-kml ol-unselectable ol-control';

    // import KML button
    var buttonImportKML = document.createElement('button');
    buttonImportKML.innerHTML = 'Import KML';
    buttonImportKML.type = 'button';
    buttonImportKML.addEventListener('click', eatlasMapFieldApp.handleImportKMLOverlay, false);
    buttonImportKML.addEventListener('touchstart', eatlasMapFieldApp.handleImportKMLOverlay, false);
    divDownloadKML.appendChild(buttonImportKML);

    // download as KML button
    var buttonDownloadKML = document.createElement('button');
    buttonDownloadKML.innerHTML = 'Download KML';
    buttonDownloadKML.type = 'button';
    buttonDownloadKML.addEventListener('click', eatlasMapFieldApp.handleDownloadKML, false);
    buttonDownloadKML.addEventListener('touchstart', eatlasMapFieldApp.handleDownloadKML, false);
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
  eatlasMapFieldApp.handleEnableEditing = function (event) {
    event.preventDefault();
    $('#eatlas-map-field-edit-overlay').remove();
  };

  /**
   * Return the keywords belonging to the selected keyword group
   * @return {*}
   */
  eatlasMapFieldApp.getKeywordGroupItems = function () {
    var keywordGroup = eatlasMapFieldApp.$keywordGroupField.val();
    if (keywordGroup !== '_none') {
      var keywords = eatlasMapFieldApp.$keywordGroupField.data('keywords');
      return keywords.filter(function (item) {
        return item.parent && item.parent === keywordGroup
      });
    }

    return null;
  };

  /**
   * Create and update options for selecting the style of a feature
   * @param selectedFeature
   * @param selectedKeywordIds
   * @param $selectStyle
   * @param useInitialSelectValue
   */
  eatlasMapFieldApp.setOptionsForSelectStyle = function(selectedFeature, selectedKeywordIds, $selectStyle, useInitialSelectValue) {
    // define selected value
    var selectedValue;
    if (useInitialSelectValue) {
      if (selectedFeature.get('styleId')) {
        selectedValue = selectedFeature.get('styleId');
      }
    }
    else {
      selectedValue = $selectStyle.val();
    }

    // remove all options
    $selectStyle.html('');

    // add default option which refers to the style defined by the map configuration
    var optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.innerText = 'Default';
    $selectStyle.append(optionDefault);

    // get keyword group items
    var keywordGroupItems = eatlasMapFieldApp.getKeywordGroupItems();

    // add styles depending on the checked keywords
    if (keywordGroupItems !== null) {

      // create option per keyword style
      selectedKeywordIds.forEach(function(termId) {
        var term = keywordGroupItems.find(function(item) {
          return termId === item.tid;
        });

        if (term && term.olStyle) {
          var optionStyle = document.createElement('option');
          optionStyle.value = term.tid;
          optionStyle.innerText = 'Style: ' + term.name;
          if (term.tid === selectedValue) {
            optionStyle.selected = true;
          }
          $selectStyle.append(optionStyle);
        }
      });
    }
  };

  /**
   * Show overlay with text fields for properties
   * @param event
   */
  eatlasMapFieldApp.handleEditProperties = function (event) {
    event.preventDefault();

    // get keyword group items
    var keywordGroupItems = eatlasMapFieldApp.getKeywordGroupItems();

    // get selected feature
    var selectedFeatures = eatlasMapFieldApp.select.getFeatures();
    if (selectedFeatures.getLength() !== 1) {
      return;
    }
    var selectedFeature = selectedFeatures.item(0);

    // read keyword ids associated with selected feature
    var featureKeywordIds = [];
    if (selectedFeature.getKeys().indexOf('keywords') >= 0 && selectedFeature.get('keywords').hasOwnProperty('value')) {
      featureKeywordIds = selectedFeature.get('keywords').value;
    }

    // create edit properties overlay
    var divEditPropertiesOverlay = document.createElement('div');
    divEditPropertiesOverlay.id = 'eatlas-map-field-edit-overlay';

    var divEditPropertiesContainer = document.createElement('div');
    divEditPropertiesContainer.id = 'eatlas-map-field-edit-container';
    divEditPropertiesOverlay.appendChild(divEditPropertiesContainer);

    var divHeadline = document.createElement('div');
    divEditPropertiesContainer.appendChild(divHeadline);

    var linkClose = document.createElement('a');
    linkClose.className = "eatlas-map-field-edit-field-close-button";
    linkClose.href = "#";
    linkClose.title = "Close";
    linkClose.addEventListener('click', function (event) {
      event.preventDefault();
      $('#eatlas-map-field-edit-overlay').remove();
    }, false);
    var linkCloseText = document.createTextNode("x");
    linkClose.appendChild(linkCloseText);
    divHeadline.appendChild(linkClose);

    var headlineEditProperties = document.createElement('h2');
    headlineEditProperties.innerHTML = 'Edit properties';
    divHeadline.appendChild(headlineEditProperties);

    // name
    var divNameContainer = document.createElement('div');
    divNameContainer.className = 'eatlas-map-field-edit-field-container';

    var labelName = document.createElement('label');
    labelName.innerHTML = 'Name';
    divNameContainer.appendChild(labelName);

    var inputName = document.createElement('input');
    var name = typeof selectedFeature.get('name') !== 'undefined' ? selectedFeature.get('name') : '';
    inputName.type = 'text';
    inputName.className = 'eatlas-map-field-edit-input-name';
    inputName.value = name;
    divNameContainer.appendChild(inputName);

    divEditPropertiesContainer.appendChild(divNameContainer);

    // keywords
    var divKeywordsContainer = document.createElement('div');
    divKeywordsContainer.className = 'eatlas-map-field-edit-field-container';

    var labelKeywords = document.createElement('label');
    labelKeywords.innerHTML = 'Keywords';
    divKeywordsContainer.appendChild(labelKeywords);

    if (keywordGroupItems !== null) {
      // create input field per keyword
      keywordGroupItems.forEach(function(item) {
        var divKeyword = document.createElement('div');
        divKeyword.className = 'eatlas-map-field-edit-input-wrapper';

        var inputKeyword = document.createElement('input');
        inputKeyword.className = 'eatlas-map-field-edit-input-keyword';
        inputKeyword.name = 'eatlas-map-field-edit-input-keyword[]';
        inputKeyword.id = 'eatlas-map-field-edit-input-keyword-' + item.tid;
        inputKeyword.type = 'checkbox';
        inputKeyword.value = item.tid;
        inputKeyword.checked = featureKeywordIds.find(function(id) {
          return id === item.tid
        });
        inputKeyword.addEventListener('change', function() {
          eatlasMapFieldApp.setOptionsForSelectStyle(selectedFeature, eatlasMapFieldApp.getSelectedKeywordIds(),
            $('select.eatlas-map-field-edit-select-style').first(), false);
        }, false);

        var labelKeyword = document.createElement('label');
        labelKeyword.htmlFor = 'eatlas-map-field-edit-input-keyword-' + item.tid;

        var styleInfo;
        if (item.olStyle !== null) {
          var escapedStyleString = String(item.olStyle).replace(/"/g, '&quot;');
          styleInfo = '<span class="info">Custom style: <span class="more-info" title="' + escapedStyleString + '">yes</span></span>';
        }
        else {
          styleInfo = '<span class="info">Custom style: no</span>';
        }


        $(labelKeyword).append('<a href="' + item.uri + '" target="_blank">' + item.name + '</a><br />' + styleInfo);

        divKeyword.appendChild(inputKeyword);
        divKeyword.appendChild(labelKeyword);
        divKeywordsContainer.appendChild(divKeyword);
      });
    }
    else {
      var pKeywords = document.createElement('p');
      pKeywords.appendChild(document.createTextNode('No keyword group selected.'));
      divKeywordsContainer.appendChild(pKeywords);
    }

    divEditPropertiesContainer.appendChild(divKeywordsContainer);

    // styles
    var divStyleContainer = document.createElement('div');
    divStyleContainer.className = 'eatlas-map-field-edit-field-container';

    var labelStyle = document.createElement('label');
    labelStyle.innerHTML = 'Style';
    divStyleContainer.appendChild(labelStyle);

    var selectStyle = document.createElement('select');
    selectStyle.className = 'eatlas-map-field-edit-select-style';
    // create options for select
    eatlasMapFieldApp.setOptionsForSelectStyle(selectedFeature, featureKeywordIds, $(selectStyle), true);

    divStyleContainer.appendChild(selectStyle);
    divEditPropertiesContainer.appendChild(divStyleContainer);


    // save button
    var divButtonContainer = document.createElement('div');
    divButtonContainer.className = 'eatlas-map-field-edit-field-container buttons';

    var updateButton = document.createElement('button');
    updateButton.innerHTML = 'Update';
    updateButton.addEventListener('click', eatlasMapFieldApp.handleCloseEditProperties, false);
    divButtonContainer.appendChild(updateButton);
    divEditPropertiesContainer.appendChild(divButtonContainer);

    eatlasMapFieldApp.$mapContainer.append(divEditPropertiesOverlay);
  };

  /**
   * Return an array with the selected keyword IDs
   * @return {Array}
   */
  eatlasMapFieldApp.getSelectedKeywordIds = function() {
    var keywordIds = [];
    $("input[name='eatlas-map-field-edit-input-keyword[]']").each(function () {
      if (this.type === 'checkbox' && this.checked || this.type === 'text') {
        keywordIds.push($(this).val())
      }
    });
    return keywordIds;
  };

  /**
   * Remove overlay with text fields for properties
   * @param event
   */
  eatlasMapFieldApp.handleCloseEditProperties = function (event) {
    event.preventDefault();
    var selectedFeatures = eatlasMapFieldApp.select.getFeatures();
    if (selectedFeatures.getLength() === 1) {
      var selectedFeature = selectedFeatures.item(0);

      // set name
      selectedFeature.set('name', $('.eatlas-map-field-edit-input-name').val());

      // set keywords
      // for the KML export to work properly it has to be an object with a property 'value'
      selectedFeature.set('keywords', {
        value: eatlasMapFieldApp.getSelectedKeywordIds()
      });

      // set style
      selectedFeature.set('styleId', $('select.eatlas-map-field-edit-select-style').first().val());
      eatlasMapFieldApp.setFeatureStyle(selectedFeature);
    }

    $('#eatlas-map-field-edit-overlay').remove();
  };

  /**
   * Replace the ExtendedData generated by the KML export of OL with a simple string where the values are separated
   * by a "|"
   *
   * @param kml
   * @return kml
   */
  eatlasMapFieldApp.replaceExtendedDataForMaris = function (kml) {
    // set up data for replacing id with name
    var keywordGroupItems = eatlasMapFieldApp.getKeywordGroupItems();

    // find ExtendedData parts for all placemarks
    var regexExtendedData = /<ExtendedData>(.*?)<\/ExtendedData>/gm;
    var matchExtendedData;
    while ((matchExtendedData = regexExtendedData.exec(kml)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (matchExtendedData.index === regexExtendedData.lastIndex) {
        regexExtendedData.lastIndex++;
      }

      if (matchExtendedData.length === 2 && matchExtendedData[1] !== '') {
        // the space is needed for the MARIS tool
        var newExtendedDataString = " ";

        if (keywordGroupItems != null) {
          var regexValue = /<Data name="keywords"><value>(.*?)<\/value><\/Data>/gm;
          var matchValue;
          while ((matchValue = regexValue.exec(matchExtendedData[1])) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (matchValue.index === regexValue.lastIndex) {
              regexValue.lastIndex++;
            }

            // create new string for the ExtendedData value
            if (matchValue.length === 2 && matchValue[1] !== '') {

              var keywordIds = matchValue[1].split(',');
              keywordIds.forEach(function (termId) {
                var selectedItem = keywordGroupItems.find(function (item) {
                  return item.tid === termId
                });
                if (selectedItem) {
                  if (newExtendedDataString !== " ") {
                    newExtendedDataString += "| "
                  }
                  newExtendedDataString += selectedItem.name;
                }
              });
            }
          }
        }

        // replace old ExtendedData part with new
        kml = kml.replace(matchExtendedData[1], newExtendedDataString);
      }
    }

    return kml;
  };

  /**
   * Export map as KML file for download
   * @param event
   */
  eatlasMapFieldApp.handleDownloadKML = function (event) {
    event.preventDefault();

    var kmlFormat = new ol.format.KML();
    var kml = kmlFormat.writeFeatures(
      eatlasMapFieldApp.source.getFeatures(),
      {featureProjection: eatlasMapFieldApp.mapConfiguration.projection});

    kml = eatlasMapFieldApp.replaceExtendedDataForMaris(kml);

    var downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', 'data:text/plain;charset=utf-8,' +
      encodeURIComponent(kml));
    downloadLink.setAttribute('download', 'mapExport.kml');
    downloadLink.style.display = 'none';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  /**
   * Open overlay for KML import
   * @param event
   */
  eatlasMapFieldApp.handleImportKMLOverlay = function (event) {
    event.preventDefault();

    // create import KML overlay
    var divImportKMLOverlay = document.createElement('div');
    divImportKMLOverlay.id = 'eatlas-map-field-edit-overlay';

    var divImportKMLContainer = document.createElement('div');
    divImportKMLContainer.id = 'eatlas-map-field-edit-container';
    divImportKMLOverlay.appendChild(divImportKMLContainer);

    var divHeadline = document.createElement('div');
    divImportKMLContainer.appendChild(divHeadline);

    var linkClose = document.createElement('a');
    linkClose.className = "eatlas-map-field-edit-field-close-button";
    linkClose.href = "#";
    linkClose.title = "Close";
    linkClose.addEventListener('click', function (event) {
      event.preventDefault();
      $('#eatlas-map-field-edit-overlay').remove();
    }, false);
    var linkCloseText = document.createTextNode("x");
    linkClose.appendChild(linkCloseText);
    divHeadline.appendChild(linkClose);

    var headlineImportKML = document.createElement('h2');
    headlineImportKML.innerHTML = 'Import KML';
    divHeadline.appendChild(headlineImportKML);

    var divInputFileKMLContainer = document.createElement('div');
    divInputFileKMLContainer.className = 'eatlas-map-field-edit-field-container';

    var labelFileKML = document.createElement('label');
    labelFileKML.innerHTML = 'KML file';
    divInputFileKMLContainer.appendChild(labelFileKML);

    var inputFileKML = document.createElement('input');
    inputFileKML.type = 'file';
    inputFileKML.id = 'import-kml-file';
    inputFileKML.addEventListener('change', function(event) {
      var files = event.target.files;
      if (!(files.length === 1 && files[0].type.match('.*kml\\+xml$'))) {
        document.getElementById('eatlas-map-field-edit-import-button').disabled = true;

        var errorMessage = document.createElement('span');
        errorMessage.className = 'error-message';
        errorMessage.innerText = 'Only KML files are accepted.';
        divInputFileKMLContainer.appendChild(errorMessage);
      } else {
        document.getElementById('eatlas-map-field-edit-import-button').disabled = false;
        $(divInputFileKMLContainer).find('.error-message').remove();
      }
    });
    divInputFileKMLContainer.appendChild(inputFileKML);
    divImportKMLContainer.appendChild(divInputFileKMLContainer);

    // close button
    var divButtonContainer = document.createElement('div');
    divButtonContainer.className = 'eatlas-map-field-edit-field-container buttons';

    var importButton = document.createElement('button');
    importButton.id = 'eatlas-map-field-edit-import-button';
    importButton.innerHTML = 'Import';
    importButton.disabled = true;
    importButton.addEventListener('click', eatlasMapFieldApp.handleImportKML, false);
    divButtonContainer.appendChild(importButton);

    divImportKMLContainer.appendChild(divButtonContainer);

    eatlasMapFieldApp.$mapContainer.append(divImportKMLOverlay);
  };

  /**
   * Import features from KML string
   *
   * @param event
   */
  eatlasMapFieldApp.handleImportKML = function (event) {
    event.preventDefault();

    var overlay = $('#eatlas-map-field-edit-overlay');

    if (document.getElementById('import-kml-file').files.length === 1) {
      var file = document.getElementById('import-kml-file').files[0];
      if (!file.type.match('.*kml\\+xml$')) {
        overlay.remove();
        return;
      }

      var reader = new FileReader();

      reader.addEventListener("load", function (event) {
        var kmlFormat = new ol.format.KML();
        eatlasMapFieldApp.source.addFeatures(kmlFormat.readFeatures(event.target.result, {
          featureProjection: eatlasMapFieldApp.mapConfiguration.projection
        }));
        overlay.remove();
      });

      overlay.find('#eatlas-map-field-edit-container').html("<i>loading KML</i>");
      reader.readAsText(file);
    }
    else {
      overlay.remove();
    }

  };

  /**
   * Depending on the checkbox value, either save current map configuration or remove configuration from
   * text area
   */
  eatlasMapFieldApp.handleChangeUseCustomMapConf = function () {
    if (eatlasMapFieldApp.$customMapConfCheckbox.is(':checked')) {
      eatlasMapFieldApp.updateCustomMapConfTextArea();
    }
    else {
      eatlasMapFieldApp.$customMapConfTextField.val('');
    }
    eatlasMapFieldApp.exportMapAsImage();
  };

  /**
   * Save the current viewport in the custom map configuration text area
   */
  eatlasMapFieldApp.updateCustomMapConfTextArea = function() {
    var conf = {
      zoom_level: eatlasMapFieldApp.map.getView().getZoom(),
      center_x: eatlasMapFieldApp.map.getView().getCenter()[0],
      center_y: eatlasMapFieldApp.map.getView().getCenter()[1]
    };

    eatlasMapFieldApp.$customMapConfTextField.val(JSON.stringify(conf));
  };

  /**
   * Export map as image
   */
  eatlasMapFieldApp.exportMapAsImage = function () {
    var divExportMap = document.createElement('div');
    divExportMap.id = 'eatlas-map-field-map-export';
    divExportMap.style.height = eatlasMapFieldApp.$mapContainer.height() + 'px';
    divExportMap.style.width = eatlasMapFieldApp.$mapContainer.width() + 'px';
    eatlasMapFieldApp.$mapContainer.append(divExportMap);

    // set up the map
    // we need to create a new map to avoid having a point where the mouse leaves the map in the image
    var raster = eatlasMapFieldApp.createRasterLayer();
    var source = eatlasMapFieldApp.createVectorLayerSource();
    var vector = eatlasMapFieldApp.createVectorLayer(source);
    var map = eatlasMapFieldApp.createMap(
      raster,
      vector,
      'eatlas-map-field-map-export'
    );

    if (eatlasMapFieldApp.$customMapConfCheckbox.is(':checked')) {
       map.setView(
         new ol.View({
           projection: eatlasMapFieldApp.mapConfiguration.projection,
           center: eatlasMapFieldApp.map.getView().getCenter(),
           zoom: eatlasMapFieldApp.map.getView().getZoom()
         })
       );
    }

    var exportMapTimeout;
    map.on('postcompose', function (event) {
      clearTimeout(exportMapTimeout);
      exportMapTimeout = setTimeout(function () {
        var canvas = event.context.canvas;

        var imgData = canvas.toDataURL();
        eatlasMapFieldApp.$imageBlobTextField.val(imgData);

        if (divExportMap) {
          divExportMap.remove();
        }
      }, 100);
    });
    map.renderSync();
  };

  /**
   * Set a custom style for a feature when it was selected via the properties popup
   * @param feature
   */
  eatlasMapFieldApp.setFeatureStyle = function(feature) {
    if (feature.get('styleId')) {
      var keyword = eatlasMapFieldApp.getKeywordGroupItems().find(function (item) {
        return item.tid === feature.get('styleId');
      });
      if (keyword && keyword.olStyle) {
        feature.setStyle(eatlasMapFieldApp.createOlStyleFromJson(keyword.olStyle));
      }
    }
    else {
      feature.setStyle(null);
    }
  };

  /**
   * Get the map configuration depending on the selected option in the select field.
   */
  eatlasMapFieldApp.getSelectedMapConfiguration = function () {
    var selectedConfigId = eatlasMapFieldApp.$mapConfigurationsField.val();
    var configurations = eatlasMapFieldApp.$mapConfigurationsField.data('map-configurations');

    var selectedConfiguration = configurations.find(function (configuration) {
      return selectedConfigId.toString() === configuration.mid;
    });

    // map the base map key value to the openlayers sources
    selectedConfiguration.getOlBaseMapSource = function () {
      if (selectedConfiguration.tile_wms_options === '' || selectedConfiguration.tile_wms_options === '##OSM##') {
        return new ol.source.OSM();
      } else {
        return new ol.source.TileWMS(JSON.parse(selectedConfiguration.tile_wms_options));
      }
    };

    // return the coordinates for the center of the map
    selectedConfiguration.getCenterCoordinates = function () {
      return [parseFloat(this.center_x), parseFloat(this.center_y)];
    };

    // return a ol.Style object
    selectedConfiguration.getStyle = function () {
      return eatlasMapFieldApp.createOlStyleFromJson(selectedConfiguration.style);
    };

    return selectedConfiguration;
  };

  /**
   * Create an openlayers style from a JSON string
   * @param styleJson
   * @return {ol.style.Style}
   */
  eatlasMapFieldApp.createOlStyleFromJson = function(styleJson) {
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
    if (styleJson !== '') {
      var customStyle = JSON.parse(styleJson);
      if (customStyle) {
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

    // trigger mapReady event to inform other applications that the map is finished initialising
    $(document).trigger('mapReady');
  });
}(jQuery));
