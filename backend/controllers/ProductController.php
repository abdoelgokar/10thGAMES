<?php
/**
 * SPIDER X — Product Controller
 * backend/controllers/ProductController.php
 */

require_once __DIR__ . '/../database/connection.php';

class ProductController {
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
        $stmt = $this->db->query("SELECT * FROM products ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
    }

    private function getOne($id) {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode($stmt->fetch() ?: ["error" => "Product not found"]);
    }

    private function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("INSERT INTO products (id, barcode, name, category, cost_price, sell_price, stock, min_stock) VALUES (:id, :barcode, :name, :category, :cost_price, :sell_price, :stock, :min_stock)");
        $id = uniqid('prod_');
        $stmt->execute([
            'id' => $id,
            'barcode' => $data['barcode'] ?? '',
            'name' => $data['name'],
            'category' => $data['category'] ?? '',
            'cost_price' => $data['costPrice'] ?? 0,
            'sell_price' => $data['sellPrice'] ?? 0,
            'stock' => $data['stock'] ?? 0,
            'min_stock' => $data['minStock'] ?? 5
        ]);
        echo json_encode(["success" => true, "id" => $id]);
    }

    private function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $this->db->prepare("UPDATE products SET barcode = :barcode, name = :name, category = :category, cost_price = :cost_price, sell_price = :sell_price, stock = :stock, min_stock = :min_stock WHERE id = :id");
        $stmt->execute([
            'id' => $id,
            'barcode' => $data['barcode'] ?? '',
            'name' => $data['name'],
            'category' => $data['category'] ?? '',
            'cost_price' => $data['costPrice'] ?? 0,
            'sell_price' => $data['sellPrice'] ?? 0,
            'stock' => $data['stock'] ?? 0,
            'min_stock' => $data['minStock'] ?? 5
        ]);
        echo json_encode(["success" => true]);
    }

    private function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM products WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode(["success" => true]);
    }
}
