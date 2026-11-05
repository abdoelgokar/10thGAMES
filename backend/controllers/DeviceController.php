<?php
/**
 * SPIDER X — Device Model & Controller
 * backend/controllers/DeviceController.php
 */

require_once __DIR__ . '/../database/connection.php';

class DeviceController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function handleRequest($method, $id = null) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else {
                    $this->getAll();
                }
                break;
            case 'POST':
                $this->create();
                break;
            case 'PUT':
                $this->update($id);
                break;
            case 'DELETE':
                $this->delete($id);
                break;
            default:
                http_response_code(405);
                echo json_encode(["error" => "Method not allowed"]);
                break;
        }
    }

    private function getAll() {
        $stmt = $this->db->query("SELECT * FROM devices ORDER BY number ASC");
        echo json_encode($stmt->fetchAll());
    }

    private function getOne($id) {
        $stmt = $this->db->prepare("SELECT * FROM devices WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $device = $stmt->fetch();
        if ($device) {
            echo json_encode($device);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Device not found"]);
        }
    }

    private function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("INSERT INTO devices (id, type, number, status, hourly_price) VALUES (:id, :type, :number, :status, :hourly_price)");
        $id = uniqid('dev_');
        $stmt->execute([
            'id' => $id,
            'type' => $data['type'],
            'number' => $data['number'],
            'status' => $data['status'] ?? 'available',
            'hourly_price' => $data['hourlyPrice'] ?? 50
        ]);
        echo json_encode(["success" => true, "id" => $id]);
    }

    private function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $fields = [];
        $params = ['id' => $id];

        if (isset($data['status'])) { $fields[] = "status = :status"; $params['status'] = $data['status']; }
        if (isset($data['hourlyPrice'])) { $fields[] = "hourly_price = :price"; $params['price'] = $data['hourlyPrice']; }
        if (isset($data['number'])) { $fields[] = "number = :number"; $params['number'] = $data['number']; }

        if (empty($fields)) {
            echo json_encode(["success" => true]);
            return;
        }

        $sql = "UPDATE devices SET " . implode(", ", $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true]);
    }

    private function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM devices WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode(["success" => true]);
    }
}
