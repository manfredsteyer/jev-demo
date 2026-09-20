import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CopilotChat } from '@copilotkit/angular';

@Component({
  imports: [CopilotChat],
  selector: 'app-chat',
  styleUrl: './chat.css',
  templateUrl: './chat.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {}
