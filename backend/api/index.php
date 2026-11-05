<?php
/**
 * SPIDER X — Main REST API Router
 * backend/api/index.php
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../database/connection.php';

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uriSegments = explode('/', trim($requestUri, '/'));

// Route determination
$resource = isset($_GET['resource']) ? $_GET['resource'] : (isset($uriSegments[2]) ? $uriSegments[2] : '');
$id = isset($_GET['id']) ? $_GET['id'] : (isset($uriSegments[3]) ? $uriSegments[3] : null);
$method = $_SERVER['REQUEST_METHOD'];

switch ($resource) {
    case 'health':
        echo json_encode(["status" => "ok", "system" => "SPIDER X API", "timestamp" => date('Y-m-d H:i:s')]);
        break;

    case 'devices':
        require_once __DIR__ . '/../controllers/DeviceController.php';
        $controller = new DeviceController();
        $controller->handleRequest($method, $id);
        break;

    case 'products':
        require_once __DIR__ . '/../controllers/ProductController.php';
        $controller = new ProductController();
        $controller->handleRequest($method, $id);
        break;

    case 'sales':
        require_once __DIR__ . '/../controllers/SaleController.php';
        $controller = new SaleController();
        $controller->handleRequest($method, $id);
        break;

    case 'sessions':
        require_once __DIR__ . '/../controllers/SessionController.php';
        $controller = new SessionController();
        $controller->handleRequest($method, $id);
        break;

    case 'customers':
        require_once __DIR__ . '/../controllers/CustomerController.php';
        $controller = new CustomerController();
        $controller->handleRequest($method, $id);
        break;

    case 'employees':
        require_once __DIR__ . '/../controllers/EmployeeController.php';
        $controller = new EmployeeController();
        $controller->handleRequest($method, $id);
        break;

    case 'expenses':
        require_once __DIR__ . '/../controllers/ExpenseController.php';
        $controller = new ExpenseController();
        $controller->handleRequest($method, $id);
        break;

    default:
        http_response_code(404);
        echo json_encode(["error" => "Resource not found"]);
        break;
}
