<?php

include_once('eatlas_map_field.constants.inc');

/**
 * Callback for admin module configuration overview page
 * @return string
 * @throws Exception
 */
function _eatlas_map_field_admin_overview() {
	$map_configurations = db_select(EATLAS_MAP_FIELD_DB_TABLE_MAP_CONFIG, 'map_conf')
		->fields('map_conf', array('mid', 'name'))
		->orderBy('name')
		->execute()
		->fetchAllKeyed();

	$header = array(t('Title'), t('Operations'));
	$rows = array();
	foreach ($map_configurations as $mid => $name) {
		$rows[] = array(
			$name,
			l(t('edit'), "admin/config/eatlas/eatlas_map_field/$mid/edit")
		);
	}

	$output = '<h3>' . t('eAtlas map field map configurations overview') . '</h3>';
	$output .= theme('table', array('header' => $header, 'rows' => $rows, 'empty' => t('No map configurations available.')));
	$output .= '<p>' . l(t('Create new map configuration'), "admin/config/eatlas/eatlas_map_field/create") . '</p>';

	return $output;
}

/**
 * Callback for admin module configuration edit/create page
 *
 * @param $form
 * @param $form_state
 * @param null $mid
 * @return array
 */
function _eatlas_map_field_admin($form, &$form_state, $mid = NULL) {
	$map_config = eatlas_map_field_load_map_config($mid);

	// https://api.drupal.org/api/drupal/developer%21topics%21forms_api_reference.html/7
	$form = array();
	$form['name'] = array(
		'#type' => 'textfield',
		'#title' => t('Name'),
		'#description' => t('Name of the map caponfiguration.'),
		'#default_value' => property_exists($map_config, 'name') ? $map_config->name : '',
		'#required' => TRUE
	);

	$form['tile_wms_options'] = array(
		'#columns' => array('tile_wms_options'),
		'#title' => 'TileWMS options',
		'#description' => 'Add the openlayers TileWMS options as JSON.<br>Example:<pre>{
	"url": "https://ahocevar.com/geoserver/wms",
	"params": {"LAYERS": "ne:ne", "TILED": true, "FORMAT_OPTIONS": "dpi:240"},
	"serverType": "geoserver",
	"crossOrigin": "anonymous"
}</pre>To use the openlayers standard base map from OSM enter \'##OSM##\'',
		'#type' => 'textarea',
		'#default_value' => property_exists($map_config, 'tile_wms_options') ? $map_config->tile_wms_options : '##OSM##',
		'#required' => TRUE
	);

	$form['projection'] = array(
		'#type' => 'select',
		'#title' => t('Projection'),
		'#description' => t('The projection of the map. Default is EPSG:3857. See <a href="https://openlayers.org/en/latest/apidoc/ol.proj.Projection.html">https://openlayers.org/en/latest/apidoc/ol.proj.Projection.html</a> for more information.'),
		'#default_value' => property_exists($map_config, 'projection') ? $map_config->projection : 'EPSG:3857',
		'#options' => array(
			'EPSG:3857' => 'EPSG:3857',
			'EPSG:4326' => 'EPSG:4326'
		),
		'#required' => TRUE
	);

	$form['center_x'] = array(
		'#type' => 'textfield',
		'#title' => t('Center easting'),
		'#description' => t('The x-coordinate for the center of the map, depending on the projection. To get the coordinates you can use <a href="https://epsg.io/map">https://epsg.io/map</a>.'),
		'#default_value' => property_exists($map_config, 'center_x') ? $map_config->center_x : 15000000,
		'#required' => TRUE
	);

	$form['center_y'] = array(
		'#type' => 'textfield',
		'#title' => t('Center northing'),
		'#description' => t('The y-coordinate for the center of the map, depending on the projection. To get the coordinates you can use <a href="https://epsg.io/map">https://epsg.io/map</a>.'),
		'#default_value' => property_exists($map_config, 'center_y') ? $map_config->center_y : -3350000,
		'#required' => TRUE
	);

	$form['zoom_level'] = array(
		'#type' => 'textfield',
		'#title' => t('Zoom level'),
		'#description' => t('The zoom level of the map. A float value between 0 and 28.'),
		'#default_value' => property_exists($map_config, 'zoom_level') ? $map_config->zoom_level : 4,
		'#required' => TRUE
	);

	$form['aspect_ratio'] = array(
		'#type' => 'textfield',
		'#title' => t('Aspect Ratio'),
		'#description' => t('The aspect ratio of the map. This has an influence on the aspect ratio of the generated image. Default is 4:3. Format: x:y'),
		'#default_value' => property_exists($map_config, 'aspect_ratio') ? $map_config->aspect_ratio : '4:3',
		'#required' => TRUE
	);

	$form['style'] = array(
		'#columns' => array('style'),
		'#title' => 'Style',
		'#description' => 'Add a custom style for the geometries as JSON. When left empty the default style will be used.<br>
Example (inlcudes all possible options):<pre>
{
	"circle": {"radius": 5},
	"fill": {"colour": "rgba(255,255,255,0.4)"},
	"stroke": {"colour": "#3399CC", "width": 1.25}
}
			</pre>',
		'#type' => 'textarea',
		'#default_value' => property_exists($map_config, 'style') ? $map_config->style : '',
		'#required' => FALSE
	);

	$form['actions'] = array('#type' => 'actions');
	$form['actions']['submit'] = array(
		'#type' => 'submit',
		'#value' => t('Save')
	);

	if (!empty($map_config->mid)) {
		$form['mid'] = array(
			'#type' => 'hidden',
			'#value' => $map_config->mid
		);
	}

	return $form;
}

/**]
 * @param $form
 * @param $form_state
 */
function _eatlas_map_field_admin_validate($form, &$form_state) {
	if ($form_state['values']['tile_wms_options'] !== '##OSM##' && json_decode($form_state['values']['tile_wms_options']) === NULL) {
		form_set_error('tile_wms_options', t('Tile WMS options does not contain valid JSON.'));
	}

	if ($form_state['values']['zoom_level'] !== '' && !is_numeric($form_state['values']['zoom_level'])) {
		form_set_error('zoom_level', t('Zoom level is not a valid float number.'));
	}

	if ($form_state['values']['aspect_ratio'] !== '') {
		$items = explode (':', $form_state['values']['aspect_ratio']);
		if (count($items) !== 2) {
			form_set_error('aspect_ratio', t('Aspect ratio does not contain a valid format.'));
		}
	}

	if ($form_state['values']['style'] !== '' && json_decode($form_state['values']['style']) === NULL) {
		form_set_error('style', t('Style does not contain valid JSON.'));
	}
}

/**
 * @param $form
 * @param $form_state
 * @throws Exception
 */
function _eatlas_map_field_admin_submit($form, &$form_state) {
	if (isset($form_state['values']['mid'])) {
		$map_config = eatlas_map_field_load_map_config($form_state['values']['mid']);
	} else {
		$map_config = new stdClass();
	}

	$map_config->name = $form_state['values']['name'];
	$map_config->tile_wms_options = $form_state['values']['tile_wms_options'];
	$map_config->projection = $form_state['values']['projection'];
	$map_config->center_x = $form_state['values']['center_x'];
	$map_config->center_y = $form_state['values']['center_y'];
	$map_config->zoom_level = $form_state['values']['zoom_level'];
	$map_config->aspect_ratio = $form_state['values']['aspect_ratio'];
	$map_config->style = $form_state['values']['style'];

	eatlas_map_field_save_map_config($map_config);
	drupal_set_message('Map configuration saved.');
	$form_state['redirect'] = 'admin/config/eatlas/eatlas_map_field';
}

/**
 * Display a personalised title for "Edit configuration" pages
 * @param $branding
 * @return string
 */
function _eatlas_map_field_admin_edit_title($mid) {
	$map_config = eatlas_map_field_load_map_config($mid);
	return 'Edit "' . $map_config->name . '" configuration';
}
