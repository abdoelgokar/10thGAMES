<?php
/**
 * SPIDER X — Sale Controller
 * backend/controllers/SaleController.php
 */

require_once __DIR__ . '/../database/connection.php';

class SaleController {
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
        $stmt = $this->db->query("SELECT * FROM sales ORDER BY timestamp DESC LIMIT 100");
        echo json_encode($stmt->fetchAll());
    }

    private function getOne($id) {
        $stmt = $this->db->prepare("SELECT * FROM sales WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode($stmt->fetch() ?: ["error" => "Sale not found"]);
    }

    private function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("INSERT INTO sales (id, invoice_no, session_id, sale_type, customer_name, subtotal, discount, tax, total, payment_method, timestamp) VALUES (:id, :invoice_no, :session_id, :sale_type, :customer_name, :subtotal, :discount, :tax, :total, :payment_method, NOW())");
        $id = uniqid('sale_');
        $stmt->execute([
            'id' => $id,
            'invoice_no' => $data['invoiceNo'] ?? ('SPX-' . rand(10000, 99999)),
            'session_id' => $data['sessionId'] ?? null,
            'sale_type' => $data['saleType'] ?? 'pos',
            'customer_name' => $data['customerName'] ?? 'عميل',
            'subtotal' => $data['subtotal'] ?? 0,
            'discount' => $data['discount'] ?? 0,
            'tax' => $data['tax'] ?? 0,
            'total' => $data['total'] ?? 0,
            'payment_method' => $data['paymentMethod'] ?? 'cash'
        ]);
        echo json_encode(["success" => true, "id" => $id]);
    }

    private function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM sales WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode(["success" => true]);
    }
}
