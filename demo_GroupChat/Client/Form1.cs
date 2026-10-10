using System;
using System.IO;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Client
{
    public partial class Form1 : Form
    {
        private TcpClient client;
        private StreamWriter writer;
        private StreamReader reader;

        public Form1()
        {
            InitializeComponent();
        }

        private async void btnConnect_Click(object sender, EventArgs e)
        {
            try
            {
                client = new TcpClient();
                await client.ConnectAsync(textBox1.Text, int.Parse(textBox2.Text));

                writer = new StreamWriter(client.GetStream()) { AutoFlush = true };
                reader = new StreamReader(client.GetStream());

                AddMessage("connected");
                btnConnect.Enabled = false;

               
                _ = ReceiveMessagesAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show("ko connect duoc: " + ex.Message);
            }
        }

        

        private async Task ReceiveMessagesAsync()
        {
            try
            {
                while (true)
                {
                    string message = await reader.ReadLineAsync();
                    if (message == null) break;
                    AddMessage(message);
                }
            }
            catch
            {
                AddMessage("lost connection");
            }
        }

        private void AddMessage(string message)
        {
            if (rtbChat.InvokeRequired)
            {
                rtbChat.Invoke(new Action(() => rtbChat.AppendText(message + Environment.NewLine)));
            }
            else
            {
                rtbChat.AppendText(message + Environment.NewLine);
            }
        }

        private async void btnSend_Click_1(object sender, EventArgs e)
        {
            

            if (!string.IsNullOrWhiteSpace(InputMsg.Text))
            {
                string msg = InputMsg.Text;
                await writer.WriteLineAsync(msg);
                AddMessage("me: " + msg);        
                InputMsg.Clear();
            }
        }
    }
}