using System.IO;
using System.Net;
using FluentFTP;
using static System.Windows.Forms.VisualStyles.VisualStyleElement;
namespace demo_FTP
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }
        private string? avatarPath;
        private string? selectedFilePath;
        private void ChangeAvt_Click(object sender, EventArgs e)
        {
            using OpenFileDialog dialog = new OpenFileDialog();

            dialog.Filter = "Image Files|*.jpg;*.jpeg;*.png";

            if (dialog.ShowDialog() != DialogResult.OK)
                return;

            avatarPath = dialog.FileName;
            selectedFilePath = avatarPath;

            using Image temp = Image.FromFile(avatarPath);

            pictureBox1.Image = new Bitmap(temp);
        }
        private List<string> attachmentPaths = new();
        private void Attach_Click(object sender, EventArgs e)
        {
            using OpenFileDialog dialog = new OpenFileDialog();

            dialog.Multiselect = true;

            dialog.Filter = "All Files|*.*";

            if (dialog.ShowDialog() != DialogResult.OK)
                return;

            foreach (string file in dialog.FileNames)
            {
                attachmentPaths.Add(file);

                tep.Items.Add(Path.GetFileName(file));
            }

            if (dialog.FileNames.Length > 0)
                selectedFilePath = dialog.FileNames[0];
        }

        private void UploadFileToFTP(string filePath)
        {
            try
            {
                using (var client = new FtpClient("127.0.0.1", "demo11", "123",21))
                {
                    client.Config.EncryptionMode = FtpEncryptionMode.Explicit;
                    client.Config.ValidateAnyCertificate = true;

                    client.Connect();
                    client.UploadFile(filePath, "/" + Path.GetFileName(filePath));

                  
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("loi: " + ex.Message);
            }
        }
        

        private void btnSave_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(selectedFilePath))
            {
                MessageBox.Show("Please select a file to upload.", "No file", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            UploadFileToFTP(selectedFilePath);
        }
    }
}
