import { Injectable } from '@angular/core';
import { EchoService } from './echo.service';

@Injectable({
  providedIn: 'root'
})
export class TestEchoHybridService {
  
  constructor(private echoService: EchoService) {}
  
  /**
   * Test the Echo Hybrid Connection
   */
  async testConnection(): Promise<void> {
    console.log('🧪 Testing Echo Hybrid Connection...');
    
    // 1. Test connection status
    console.log('📡 Current connection status:', this.echoService.connected());
    
    // 2. Test connection observable
    this.echoService.connection$.subscribe(connected => {
      console.log('📡 Connection status changed:', connected);
    });
    
    // 3. Initialize connection
    console.log('🔌 Attempting to connect...');
    this.echoService.connect();
    
    // 4. Wait a bit and check status again
    setTimeout(() => {
      console.log('📡 After connect attempt:', this.echoService.connected());
      
      // 5. Test channel creation
      this.testChannelCreation();
      
    }, 2000);
  }
  
  /**
   * Test channel creation and event listening
   */
  private testChannelCreation(): void {
    console.log('📺 Testing channel creation...');
    
    const channel = this.echoService.channel('test-channel');
    
    if (channel) {
      console.log('✅ Channel created successfully');
      
      // Listen to test events
      channel.listen('.test-event', (data: any) => {
        console.log('🎉 Test event received:', data);
      });
      
      channel.listen('.message.sent', (data: any) => {
        console.log('📨 Message event received:', data);
      });
      
      console.log('👂 Listening to test events on channel');
      
    } else {
      console.log('❌ Failed to create channel');
    }
  }
  
  /**
   * Test channel types
   */
  testChannelTypes(): void {
    console.log('🧪 Testing different channel types...');
    
    // Public channel
    const publicChannel = this.echoService.channel('public-test');
    console.log('📺 Public channel:', publicChannel ? '✅ Created' : '❌ Failed');
    
    // Private channel
    const privateChannel = this.echoService.private('private-test');
    console.log('🔒 Private channel:', privateChannel ? '✅ Created' : '❌ Failed');
    
    // Presence channel
    const presenceChannel = this.echoService.join('presence-test');
    console.log('👥 Presence channel:', presenceChannel ? '✅ Created' : '❌ Failed');
  }
  
  /**
   * Test reconnection
   */
  testReconnection(): void {
    console.log('🔄 Testing reconnection...');
    
    this.echoService.reconnect();
    
    setTimeout(() => {
      console.log('📡 After reconnect:', this.echoService.connected());
    }, 3000);
  }
  
  /**
   * Run complete test suite
   */
  async runCompleteTest(): Promise<void> {
    console.log('🚀 Starting Echo Hybrid Test Suite...');
    console.log('=====================================');
    
    await this.testConnection();
    
    setTimeout(() => {
      this.testChannelTypes();
    }, 3000);
    
    setTimeout(() => {
      console.log('=====================================');
      console.log('✅ Echo Hybrid Test Suite Completed');
      console.log('=====================================');
    }, 5000);
  }
}
