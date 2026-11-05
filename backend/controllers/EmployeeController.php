<?php
/**
 * SPIDER X — Employee Controller
 * backend/controllers/EmployeeController.php
 */

require_once __DIR__ . '/../database/connection.php';

class EmployeeController {
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
        $stmt = $this->db->query("SELECT id, name, username, role, active, join_date FROM employees ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
    }

    private function getOne($id) {
        $stmt = $this->db->prepare("SELECT id, name, username, role, active, join_date FROM employees WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode($stmt->fetch() ?: ["error" => "Employee not found"]);
    }

    private function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("INSERT INTO employees (id, name, username, password_hash, role, active, join_date) VALUES (:id, :name, :username, :password_hash, :role, 1, NOW())");
        $id = uniqid('emp_');
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'username' => $data['username'],
            'password_hash' => password_hash($data['password'] ?? '1234', PASSWORD_BCRYPT),
            'role' => $data['role'] ?? 'cashier'
        ]);
        echo json_encode(["success" => true, "id" => $id]);
    }

    private function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['active'])) {
            $stmt = $this->db->prepare("UPDATE employees SET active = :active WHERE id = :id");
            $stmt->execute(['id' => $id, 'active' => $data['active'] ? 1 : 0]);
        } else {
            $stmt = $this->db->prepare("UPDATE employees SET name = :name, username = :username, role = :role WHERE id = :id");
            $stmt->execute([
                'id' => $id,
                'name' => $data['name'],
                'username' => $data['username'],
                'role' => $data['role']
            ]);
        }
        echo json_encode(["success" => true]);
    }

    private function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM employees WHERE id = :id AND username != 'admin'");
        $stmt->execute(['id' => $id]);
        echo json_encode(["success" => true]);
    }
}
