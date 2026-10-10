using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Windows.Forms;


namespace Server
{
    public partial class Form1 : Form
    {
        private TcpListener server;
        private List<TcpClient> clients = new List<TcpClient>();
        public Form1()
        {
            InitializeComponent();
        }

        private async void btnListen_Click(object sender, EventArgs e)
        {

            int port;
            if (!int.TryParse(txtPort.Text, out port))
            {
                MessageBox.Show("Port không hợp lệ!");
                return;
            }

            try
            {
                server = new TcpListener(IPAddress.Any, port);
                server.Start();
                btnListen.Enabled = false;
                AddMessage("listening...");

                while (true)
                {
                    TcpClient client = await server.AcceptTcpClientAsync();
                    clients.Add(client);

                    string clientEndPoint = client.Client.RemoteEndPoint.ToString();
                    AddMessage($"{clientEndPoint} connected");

                    _ = ReceiveMessagesAsync(client, clientEndPoint);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Loi: " + ex.Message);
            }
        }

        //receive messages tu 1 clai en
        private async Task ReceiveMessagesAsync(TcpClient client, string clientEndPoint)
        {
            try
            {
                StreamReader reader = new StreamReader(client.GetStream());
                while (true)
                {
                    string message = await reader.ReadLineAsync();

                    if (message == null) break;

                    AddMessage(message);

                    BroadcastMessage(message, client);
                }
            }
            catch
            {
            }
            finally
            {
                clients.Remove(client);
                client.Close();
                AddMessage($"{clientEndPoint} disconnected");
            }
        }

        // broadcast
        private async void BroadcastMessage(string message, TcpClient senderClient)
        {
            foreach (TcpClient colaien in clients)
            {
                if (colaien != senderClient)
                {
                    try
                    {
                        StreamWriter writer = new StreamWriter(colaien.GetStream()) { AutoFlush = true };
                        await writer.WriteLineAsync(message);
                    }
                    catch{ }
                }
            }
        }
        private void AddMessage(string message)
        {
            if (rtbMessages.InvokeRequired)
            {
                rtbMessages.Invoke(new Action(() => rtbMessages.AppendText(message + Environment.NewLine)));
            }
            else
            {
                rtbMessages.AppendText(message + Environment.NewLine);
            }
        }
    }
}
