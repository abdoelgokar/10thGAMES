<?php
/**
 * SPIDER X — Expense Controller
 * backend/controllers/ExpenseController.php
 */

require_once __DIR__ . '/../database/connection.php';

class ExpenseController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function handleRequest($method, $id = null) {
        switch ($method) {
            case 'GET':
                $this->getAll();
                break;
            case 'POST':
                $this->create();
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
        $stmt = $this->db->query("SELECT * FROM expenses ORDER BY date DESC");
        echo json_encode($stmt->fetchAll());
    }

    private function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("INSERT INTO expenses (id, description, category, amount, date) VALUES (:id, :description, :category, :amount, NOW())");
        $id = uniqid('exp_');
        $stmt->execute([
            'id' => $id,
            'description' => $data['description'],
            'category' => $data['category'] ?? 'أخرى',
            'amount' => $data['amount'] ?? 0
        ]);
        echo json_encode(["success" => true, "id" => $id]);
    }

    private function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM expenses WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode(["success" => true]);
    }
}
