<?php

// constants for database table, field, etc names
define('EATLAS_MAP_FIELD_DB_TABLE_MAP_CONFIG', 'eatlas_map_field_map_configurations');

// functions for returning arrays (which cannot be assigned as a constant in PHP 5.3)

/**
 * @return array
 */
function get_base_map_values() {
	return array(
		1 => 'Open Street Map',
		2 => 'Bing Maps'
	);
}