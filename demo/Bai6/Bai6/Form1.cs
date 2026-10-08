using System.Data;
using System.IO;
using Microsoft.Data.SqlClient; // Hoặc dùng using System.Data.SqlClient; tùy vào package bạn cài ở bước 2
namespace Bai6
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }

        private void label1_Click(object sender, EventArgs e)
        {

        }

        private void button1_Click(object sender, EventArgs e)
        {
            string input = textBox1.Text.Trim();
            if (string.IsNullOrEmpty(input))
            {
                MessageBox.Show("Lỗi format, Vui lòng nhập lại");
                return;
            }

            string[] parts = input.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
            double[] diem = new double[parts.Length];

            for (int i = 0; i < parts.Length; i++)
            {
                string item = parts[i].Trim().Replace(',', '.');
                if (!double.TryParse(item, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out diem[i])
                    || diem[i] < 0 || diem[i] > 10)
                {
                    MessageBox.Show("Lỗi format, Vui lòng nhập lại");
                    return;
                }
            }
            MessageBox.Show("Đã nhập đúng format");

            string tb1 = "";
            for (int i = 0; i < diem.Length - 1; i++)
            {
                tb1 += "Môn " + (i + 1) + ": " + diem[i].ToString() + ", ";
            }
            tb1 += "Môn " + (diem.Length - 1 + 1) + ": " + diem[diem.Length - 1].ToString();
            textBox2.Text = tb1;

            string tb2 = "Điểm trung bình: ";
            double DTB = 0;
            for (int i = 0; i < diem.Length; i++)
            {
                DTB += diem[i];
            }
            DTB /= diem.Length;
            tb2 += DTB.ToString();
            textBox3.Text = tb2;

            string tb3 = "Điểm cao nhất: ";
            double max = diem[0];
            for (int i = 1; i < diem.Length; i++)
            {
                if (diem[i] > max)
                {
                    max = diem[i];
                }
            }
            tb3 += max.ToString() + ". Điểm thấp nhất: ";

            double min = diem[0];
            for (int i = 1; i < diem.Length; i++)
            {
                if (diem[i] < min)
                {
                    min = diem[i];
                }
            }
            tb3 += min.ToString();
            textBox4.Text = tb3;

            string tb4 = "số môn đạt: ";
            int dem = 0, dem1 = 0;
            for (int i = 0; i < diem.Length; i++)
            {
                if (diem[i] >= 5.0)
                {
                    dem++;
                }
                else
                    dem1++;
            }
            tb4 += dem.ToString() + ". Số môn không đạt: " + dem1.ToString();
            textBox5.Text = tb4;

            string tb5 = "";
            int tmp;
            if (min < 2) tmp = 1;
            else if (min < 3.5) tmp = 2;
            else if (min < 5) tmp = 3;
            else if (min < 6.5) tmp = 4;
            else tmp = 5;
            int tmp1 = 5;
            if (DTB < 3.5) tmp1 = 1;
            else if (DTB < 5) tmp1 = 2;
            else if (DTB < 6.5) tmp1 = 3;
            else if (DTB < 8) tmp1 = 4;

            int ans = Math.Min(tmp, tmp1);
            if (ans == 1) tb5 += "Yếu";
            else if (ans == 2) tb5 += "Trung bình";
            else if (ans == 3) tb5 += "Khá";
            else if (ans == 4) tb5 += "Giỏi";
            else tb5 += "Xuất sắc";

            textBox6.Text = "Xếp loại: " + tb5;

            // --- PHẦN CODE KẾT NỐI VÀ LƯU VÀO SQL SERVER ---

            // Thay "TEN_SERVER_CUA_BAN" bằng Server Name trong SSMS của bạn
            string connectionString = @"Server=(localdb)\MSSQLLocalDB; Database=QuanLyDiem; Integrated Security=True; TrustServerCertificate=True;";

            try
            {
                SqlConnection conn = new SqlConnection(connectionString);

                conn.Open();

                // Câu lệnh SQL để Insert dữ liệu
                string query = @"INSERT INTO KetQuaHocTap 
                                   (DanhSachDiem, DiemTrungBinh, DiemCaoNhat, DiemThapNhat, SoMonDat, SoMonKhongDat, XepLoai) 
                                   VALUES (@DanhSach, @DTB, @Max, @Min, @Dat, @KhongDat, @XepLoai)";

                SqlCommand cmd = new SqlCommand(query, conn);

                // Truyền các biến bạn đã tính toán vào parameters để tránh SQL Injection
                cmd.Parameters.AddWithValue("@DanhSach", textBox1.Text); // Lưu chuỗi nhập gốc hoặc dùng tb1
                cmd.Parameters.AddWithValue("@DTB", DTB);
                cmd.Parameters.AddWithValue("@Max", max);
                cmd.Parameters.AddWithValue("@Min", min);
                cmd.Parameters.AddWithValue("@Dat", dem);
                cmd.Parameters.AddWithValue("@KhongDat", dem1);
                cmd.Parameters.AddWithValue("@XepLoai", tb5);

                // Thực thi câu lệnh
                cmd.ExecuteNonQuery();


                MessageBox.Show("Đã lưu kết quả vào SQL Server thành công!", "Thông báo", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Lỗi kết nối CSDL: " + ex.Message, "Lỗi", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }



        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {

        }

        private void textBox5_TextChanged(object sender, EventArgs e)
        {

        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        private void Form1_Load(object sender, EventArgs e)
        {

        }

        private void label2_Click_1(object sender, EventArgs e)
        {

        }

        private void button2_Click(object sender, EventArgs e)
        {
            string ID = textBox8.Text.Trim();

            SqlConnection conn = new SqlConnection(@"Server=(localdb)\MSSQLLocalDB; Database=QuanLyDiem; Integrated Security=True; TrustServerCertificate=True;");
            conn.Open();

            string query = "SELECT * FROM KetQuaHocTap  ";
            SqlCommand cmd = new SqlCommand(query, conn);
            // cmd.Parameters.AddWithValue("@ID", ID);

            SqlDataReader reader = cmd.ExecuteReader();
            int i = 9;
            while (reader.Read())
            {
                TextBox textBoxnow = this.Controls["textBox" + i.ToString()] as TextBox;
                textBoxnow.Text = reader["DanhSachDiem"].ToString();
                i++;
            }

            conn.Close();
        }

        private void textBox8_TextChanged(object sender, EventArgs e)
        {

        }

        private void textBox7_TextChanged(object sender, EventArgs e)
        {

        }

        private void button3_Click(object sender, EventArgs e)
        {
            string Max = textBox7.Text.Trim();

            SqlConnection conn = new SqlConnection(@"Server=(localdb)\MSSQLLocalDB; Database=QuanLyDiem; Integrated Security=True; TrustServerCertificate=True;");
            conn.Open();

            string query = "SELECT * FROM KetQuaHocTap WHERE DiemCaoNhat = @Max";
            SqlCommand cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@Max", Max);

            SqlDataReader reader = cmd.ExecuteReader();
            int i = 9;
            while (reader.Read())
            {
                TextBox textBoxnow = this.Controls["textBox" + i.ToString()] as TextBox;
                textBoxnow.Text = reader["DanhSachDiem"].ToString();
                i++;
            }

            conn.Close();
        }

        private void button4_Click(object sender, EventArgs e)
        {
            // Tự động tạo hộp thoại chọn file
            OpenFileDialog openFileDialog1 = new OpenFileDialog();
            openFileDialog1.Filter = "Tất cả các file (*.*)|*.*|Text Files (*.txt)|*.txt";
            openFileDialog1.Title = "Chọn file cần lưu vào Database";

            if (openFileDialog1.ShowDialog() == DialogResult.OK)
            {
                string duongDanFile = openFileDialog1.FileName;
                string tenFile = Path.GetFileName(duongDanFile);
                byte[] duLieuFile = File.ReadAllBytes(duongDanFile);

                SqlConnection conn = new SqlConnection(@"Server=(localdb)\MSSQLLocalDB; Database=QuanLyDiem; Integrated Security=True; TrustServerCertificate=True;");
                conn.Open();

                // Lưu kèm dữ liệu của TextBox1 và File vào Database
                string query = @"INSERT INTO KetQuaHocTap (DanhSachDiem, DuLieuFile, TenFile) 
                                 VALUES (@DanhSach, @File, @Ten)";
                SqlCommand cmd = new SqlCommand(query, conn);

                cmd.Parameters.AddWithValue("@DanhSach", textBox1.Text);
                cmd.Parameters.AddWithValue("@File", duLieuFile);
                cmd.Parameters.AddWithValue("@Ten", tenFile);

                cmd.ExecuteNonQuery();
                conn.Close();

                MessageBox.Show("Đã lưu file vào SQL thành công!", "Thông báo", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void button5_Click(object sender, EventArgs e)
        {
            string id = textBox8.Text.Trim(); // Lấy ID từ textBox8 để biết cần tải file của dòng nào
            if (string.IsNullOrEmpty(id))
            {
                MessageBox.Show("Vui lòng nhập ID cần lấy file vào textBox8!");
                return;
            }

            SqlConnection conn = new SqlConnection(@"Server=(localdb)\MSSQLLocalDB; Database=QuanLyDiem; Integrated Security=True; TrustServerCertificate=True;");
            conn.Open();

            string query = "SELECT DuLieuFile, TenFile FROM KetQuaHocTap WHERE ID = @ID";
            SqlCommand cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@ID", id);

            SqlDataReader reader = cmd.ExecuteReader();

            if (reader.Read())
            {
                // Kiểm tra xem dòng này có dữ liệu file hay không
                if (reader["DuLieuFile"] == DBNull.Value)
                {
                    MessageBox.Show("Dòng này không có file đính kèm!");
                }
                else
                {
                    byte[] duLieuFile = (byte[])reader["DuLieuFile"];
                    string tenFileGoc = reader["TenFile"].ToString();

                    // Tự động tạo hộp thoại chọn nơi lưu file
                    SaveFileDialog saveFileDialog1 = new SaveFileDialog();
                    saveFileDialog1.FileName = tenFileGoc; // Gợi ý sẵn tên file gốc
                    saveFileDialog1.Filter = "Tất cả các file (*.*)|*.*";
                    saveFileDialog1.Title = "Chọn nơi lưu file";

                    if (saveFileDialog1.ShowDialog() == DialogResult.OK)
                    {
                        File.WriteAllBytes(saveFileDialog1.FileName, duLieuFile);
                        MessageBox.Show("Xuất file thành công!", "Thông báo", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                }
            }
            else
            {
                MessageBox.Show("Không tìm thấy dòng có ID này!");
            }

            reader.Close();
            conn.Close();
        }

        private void button7_Click(object sender, EventArgs e)
        {
            panel1.Controls.Clear();

            // 2. Gọi màn hình con ra và bắt nó giãn cho đầy khung
            UserControl2 mhDiem = new UserControl2();
            mhDiem.Dock = DockStyle.Fill;

            // 3. Nhét màn hình con vào lại khung
            panel1.Controls.Add(mhDiem);
        }

        private void button6_Click(object sender, EventArgs e)
        {
            panel1.Controls.Clear();

            // 2. Gọi màn hình con ra và bắt nó giãn cho đầy khung
            UserControl1 mhDiem = new UserControl1();
            mhDiem.Dock = DockStyle.Fill;

            // 3. Nhét màn hình con vào lại khung
            panel1.Controls.Add(mhDiem);
        }

        private void button8_Click(object sender, EventArgs e)
        {

        }
    }
}
