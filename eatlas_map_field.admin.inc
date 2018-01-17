<?php

include_once('eatlas_map_field.constants.inc');

/**
 * Callback for admin module configuration overview page
 * @return string
 * @throws Exception
 */
function _eatlas_map_field_admin_overview() {
	$map_configurations = eatlas_map_field_load_all_map_configs_as_keyed();

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

	$form['base_map_key'] = array(
		'#columns' => array('base_map_key'),
		'#title' => 'Base map',
		'#description' => 'Select the base map for this configuration.',
		'#type' => 'select',
		'#default_value' => property_exists($map_config, 'base_map_key') ? $map_config->base_map_key : 1,
		'#options' => get_base_map_values(),
		'#value_key' => 'base_map_key',
		'#required' => TRUE
	);

	$form['center_x'] = array(
		'#type' => 'textfield',
		'#title' => t('Center easting'),
		'#description' => t('The x-coordinate for the center of the map. Projection: EPSG:3857. To get the coordinates you can use <a href="https://epsg.io/map#srs=3857">https://epsg.io/map#srs=3857</a>.'),
		'#default_value' => property_exists($map_config, 'center_x') ? $map_config->center_x : 15000000,
		'#required' => TRUE
	);

	$form['center_y'] = array(
		'#type' => 'textfield',
		'#title' => t('Center northing'),
		'#description' => t('The y-coordinate for the center of the map. Projection: EPSG:3857. To get the coordinates you can use <a href="https://epsg.io/map#srs=3857">https://epsg.io/map#srs=3857</a>.'),
		'#default_value' => property_exists($map_config, 'center_y') ? $map_config->center_y : -3350000,
		'#required' => TRUE
	);

	$form['zoom_level'] = array(
		'#type' => 'select',
		'#title' => t('Zoom level'),
		'#description' => t('The zoom level of the map.'),
		'#default_value' => property_exists($map_config, 'zoom_level') ? $map_config->zoom_level : 4,
		'#options' => range(0, 28, 1),
		'#required' => TRUE
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
	// TODO
	// $form_state['values']
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
	$map_config->base_map_key = $form_state['values']['base_map_key'];
	$map_config->center_x = $form_state['values']['center_x'];
	$map_config->center_y = $form_state['values']['center_y'];
	$map_config->zoom_level = $form_state['values']['zoom_level'];

	eatlas_map_field_save_map_config($map_config);
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