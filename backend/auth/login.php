<?php
/**
 * SPIDER X — Auth Login API
 * backend/auth/login.php
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require_once __DIR__ . '/../database/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['username']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(["error" => "Username and password required"]);
    exit;
}

$db = Database::getInstance();
$stmt = $db->prepare("SELECT * FROM employees WHERE username = :username AND active = 1 LIMIT 1");
$stmt->execute(['username' => $data['username']]);
$user = $stmt->fetch();

if ($user && password_verify($data['password'], $user['password_hash'])) {
    unset($user['password_hash']);
    $token = bin2hex(random_bytes(32));
    echo json_encode([
        "success" => true,
        "token" => $token,
        "user" => $user
    ]);
} else {
    http_response_code(401);
    echo json_encode(["error" => "Invalid credentials"]);
}
