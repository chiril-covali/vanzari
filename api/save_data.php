<?php
// Set proper headers to handle CORS if needed
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");

// Check if this is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(array("message" => "Method not allowed."));
    exit;
}

// Check if data was sent
if (!isset($_POST['data'])) {
    http_response_code(400); // Bad Request
    echo json_encode(array("message" => "No data provided."));
    exit;
}

// Get the data from the POST request
$data = $_POST['data'];

// Define the file path
$file_path = "../data/data.csv";

// Make sure the data directory exists
if (!file_exists(dirname($file_path))) {
    mkdir(dirname($file_path), 0755, true);
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