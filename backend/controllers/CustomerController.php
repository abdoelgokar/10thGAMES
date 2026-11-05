<?php
/**
 * SPIDER X — Customer Controller
 * backend/controllers/CustomerController.php
 */

require_once __DIR__ . '/../database/connection.php';

class CustomerController {
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
        $stmt = $this->db->query("SELECT * FROM customers ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
    }

    private function getOne($id) {
        $stmt = $this->db->prepare("SELECT * FROM customers WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode($stmt->fetch() ?: ["error" => "Customer not found"]);
    }

    private function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("INSERT INTO customers (id, name, phone, fav_device, notes, join_date) VALUES (:id, :name, :phone, :fav_device, :notes, NOW())");
        $id = uniqid('cust_');
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'phone' => $data['phone'] ?? '',
            'fav_device' => $data['favDevice'] ?? '',
            'notes' => $data['notes'] ?? ''
        ]);
        echo json_encode(["success" => true, "id" => $id]);
    }

    private function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("UPDATE customers SET name = :name, phone = :phone, fav_device = :fav_device, notes = :notes WHERE id = :id");
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'phone' => $data['phone'] ?? '',
            'fav_device' => $data['favDevice'] ?? '',
            'notes' => $data['notes'] ?? ''
        ]);
        echo json_encode(["success" => true]);
    }

    private function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM customers WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode(["success" => true]);
    }
}
