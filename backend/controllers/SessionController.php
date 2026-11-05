<?php
/**
 * SPIDER X — Session Controller
 * backend/controllers/SessionController.php
 */

require_once __DIR__ . '/../database/connection.php';

class SessionController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function handleRequest($method, $id = null) {
        switch ($method) {
            case 'GET':
                $id ? $this->getOne($id) : $this->getAll();
                break;
            case 'POST':
                $this->create();
                break;
            case 'PUT':
                $this->update($id);
                break;
            default:
                http_response_code(405);
                echo json_encode(["error" => "Method not allowed"]);
                break;
        }
    }

    private function getAll() {
        $stmt = $this->db->query("SELECT * FROM sessions ORDER BY start_time DESC LIMIT 100");
        echo json_encode($stmt->fetchAll());
    }

    private function getOne($id) {
        $stmt = $this->db->prepare("SELECT * FROM sessions WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode($stmt->fetch() ?: ["error" => "Session not found"]);
    }

    private function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("INSERT INTO sessions (id, device_id, customer_name, phone, start_time, hourly_price, session_type, status) VALUES (:id, :device_id, :customer_name, :phone, NOW(), :hourly_price, :session_type, 'active')");
        $id = uniqid('sess_');
        $stmt->execute([
            'id' => $id,
            'device_id' => $data['deviceId'],
            'customer_name' => $data['customerName'] ?? 'عميل',
            'phone' => $data['phone'] ?? '',
            'hourly_price' => $data['hourlyPrice'] ?? 50,
            'session_type' => $data['sessionType'] ?? 'open'
        ]);

        // Mark device as occupied
        $stmtDev = $this->db->prepare("UPDATE devices SET status = 'occupied' WHERE id = :id");
        $stmtDev->execute(['id' => $data['deviceId']]);

        echo json_encode(["success" => true, "id" => $id]);
    }

    private function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['status']) && $data['status'] === 'completed') {
            $stmt = $this->db->prepare("UPDATE sessions SET status = 'completed', end_time = NOW(), cost = :cost WHERE id = :id");
            $stmt->execute(['id' => $id, 'cost' => $data['cost'] ?? 0]);

            // Release device
            if (isset($data['deviceId'])) {
                $stmtDev = $this->db->prepare("UPDATE devices SET status = 'available' WHERE id = :id");
                $stmtDev->execute(['id' => $data['deviceId']]);
            }
        }
        echo json_encode(["success" => true]);
    }
}
