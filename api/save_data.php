<?php
// Log request details for debugging
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
error_log("POST data: " . print_r($_POST, true));
error_log("Raw input: " . file_get_contents("php://input"));

// Set proper headers to handle CORS if needed
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 3600");

// Handle OPTIONS request (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if this is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(array("message" => "Method not allowed."));
    exit;
}

// Try to get data from different sources
$data = null;

// First check for FormData ('data' parameter)
if (isset($_POST['data'])) {
    $data = $_POST['data'];
    error_log("Found data in POST parameter");
}
// If not found, try raw input
else {
    $data = file_get_contents("php://input");
    error_log("Using raw input data");
}

if (empty($data)) {
    http_response_code(400); // Bad Request
    echo json_encode(array(
        "message" => "No data provided.",
        "post" => $_POST,
        "raw_size" => strlen(file_get_contents("php://input"))
    ));
    exit;
}

// Define the file path
$file_path = "../data/data.csv";

// Debug the file path and permissions
error_log("File path: " . $file_path);
error_log("Directory exists: " . (file_exists(dirname($file_path)) ? "yes" : "no"));
error_log("Directory writable: " . (is_writable(dirname($file_path)) ? "yes" : "no"));
error_log("File exists: " . (file_exists($file_path) ? "yes" : "no"));
error_log("File writable: " . (file_exists($file_path) && is_writable($file_path) ? "yes" : "no"));

// Make sure the data directory exists
if (!file_exists(dirname($file_path))) {
    if (!@mkdir(dirname($file_path), 0755, true)) {
        error_log('Failed to create directory: ' . dirname($file_path));
        http_response_code(500);
        echo json_encode(array("message" => "Failed to create directory"));
        exit;
    }
}

// Check if file exists and is writable, or can be created
if ((file_exists($file_path) && !is_writable($file_path)) || 
    (!file_exists($file_path) && !is_writable(dirname($file_path)))) {
    error_log("File is not writable: " . $file_path);
    http_response_code(500);
    echo json_encode(array("message" => "Permission denied"));
    exit;
}

// Write the data to the CSV file
$result = file_put_contents($file_path, $data);

if ($result !== false) {
    http_response_code(200); // OK
    echo json_encode(array(
        "message" => "Data saved successfully",
        "bytes_written" => $result
    ));
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(array(
        "message" => "Failed to write data to file",
        "error" => error_get_last()
    ));
}
?>