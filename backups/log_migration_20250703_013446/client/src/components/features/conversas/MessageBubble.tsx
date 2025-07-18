import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message } from "@/types/conversations";
import { Bot, Settings, FileText, Check, CheckCheck, Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaMessage } from "./MediaMessage";

// Function to detect auto-generated content (file names, system messages)
function isAutoGeneratedContent(content: string): boolean {
  if (!content || content.trim().length === 0) return true;
  
  const trimmedContent = content.trim();
  
  // Common patterns for auto-generated file content
  const autoGeneratedPatterns = [
    /^📎\s*.+\.(jpg|jpeg|png|gif|pdf|doc|docx|mp3|mp4|wav|ogg|avi|mov|webm)$/i, // File with emoji prefix
    /^.+\.(jpg|jpeg|png|gif|pdf|doc|docx|mp3|mp4|wav|ogg|avi|mov|webm)$/i, // Just filename
    /^(documento|imagem|áudio|vídeo|arquivo)\s*enviado/i, // System messages
    /^whatsapp-audio-\d+\.mp4$/i, // WhatsApp audio files
    /^\d{13}-.*\.(mp3|mp4|wav|ogg|webm)$/i, // Timestamp-based filenames
    /^(audio|image|video|document)_\d+/i, // Generic file patterns
    /^PTT-\d+-WA\d+\.ogg$/i, // WhatsApp voice messages
    /^IMG-\d+-WA\d+\.(jpg|jpeg|png)$/i, // WhatsApp images
    /^VID-\d+-WA\d+\.(mp4|avi|mov)$/i, // WhatsApp videos
    /^DOC-\d+-WA\d+\.(pdf|doc|docx)$/i, // WhatsApp documents
    /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(mp3|mp4|wav|ogg|webm)$/i, // Date-time filenames
    /^recording-\d+\.(mp3|mp4|wav|ogg|webm)$/i, // Generic recording files
  ];
  
  return autoGeneratedPatterns.some(pattern => pattern.test(trimmedContent));
}

// Function to determine if content should be hidden based on message context
function shouldHideContent(message: Message): boolean {
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const isReceived = message.type === 'received';
  
  // For received messages with attachments, hide auto-generated descriptive text
  if (isReceived && hasAttachments && message.content) {
    const trimmedContent = message.content.trim();
    
    // Patterns for auto-generated descriptions of received files
    const autoDescriptionPatterns = [
      /^(paciente|cliente)\s+enviou\s+(foto|imagem|áudio|vídeo|documento)/i,
      /^(áudio|vídeo|imagem|foto|documento)\s+(do|da)\s+(paciente|cliente)/i,
      /^test\s+(image|audio|video|document)\s+upload/i,
      /^(mp4|jpg|jpeg|png|pdf|doc|docx|wav|mp3|ogg)\s+(de|do)\s+teste/i,
      /^arquivo\s+(recebido|enviado)/i,
      /^mídia\s+(recebida|enviada)/i,
      /^audio\s+mp4\s+de\s+teste\s+do\s+paciente$/i,
      /^ãudio\s+do\s+paciente$/i,
      /^áudio\s+do\s+paciente$/i,
      /^Ãudio\s+do\s+paciente$/,
    ];
    
    const isAutoDescription = autoDescriptionPatterns.some(pattern => pattern.test(trimmedContent));
    
    // Also check for exact string match for encoding issues
    const isExactMatch = trimmedContent === "Ãudio do paciente";
    
    return isAutoDescription || isExactMatch;
  }
  
  // For all other cases, use the general auto-generated content detection
  return isAutoGeneratedContent(message.content || '');
}

interface MessageBubbleProps {
  message: Message;
  isOptimistic?: boolean;
  optimisticStatus?: 'uploading' | 'sent' | 'failed';
}

function getMessageTypeIcon(type: Message['type']) {
  switch (type) {
    case 'sent_ai':
      return <Bot className="w-3 h-3 text-blue-600" />;
    case 'sent_system':
      return <Settings className="w-3 h-3 text-gray-600" />;
    case 'note':
      return <FileText className="w-3 h-3 text-amber-600" />;
    default:
      return null;
  }
}

export function MessageBubble({ message, isOptimistic, optimisticStatus }: MessageBubbleProps) {
  // Use sender_type to determine message positioning
  const isReceived = message.sender_type === 'patient';
  const isNote = message.type === 'note';
  const isSent = !isReceived && !isNote;
  

  
  return (
    <div className={cn("flex mb-3", isReceived ? "justify-start" : "justify-end")}>
      {/* Avatar for received messages (left side) */}
      {isReceived && (
        <Avatar className="w-6 h-6 mr-2 mt-1 flex-shrink-0">
          <AvatarImage src={message.sender_avatar} />
          <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
            {message.sender_name?.charAt(0)?.toUpperCase() || 'P'}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex flex-col max-w-xs lg:max-w-md">
        {/* Note label for note messages */}
        {isNote && (
          <div className="flex items-center mb-1 justify-end">
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Nota
            </span>
          </div>
        )}
        
        <div
          className={cn(
            "px-4 py-3 rounded-2xl relative rounded-tr-md",
            isReceived 
              ? "bg-gray-100 text-gray-900" 
              : "bg-[#0f766e] text-white",
            // 🎯 INDICADOR OPTIMISTIC: Visual feedback para uploads
            isOptimistic && optimisticStatus === 'uploading' && "opacity-70 animate-pulse",
            isOptimistic && optimisticStatus === 'failed' && "bg-red-100 text-red-900 border border-red-300"
          )}
        >
          {/* Media content */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2">
              {message.attachments.map((attachment, index) => (
                <MediaMessage
                  key={index}
                  media_type={attachment.file_type || message.message_type || 'document'}
                  media_url={attachment.file_url || attachment.whatsapp_media_url || ''}
                  media_filename={attachment.file_name}
                  media_size={attachment.file_size}
                  media_duration={attachment.duration}
                  media_thumbnail={attachment.thumbnail_url}
                />
              ))}
            </div>
          )}
          
          {/* Text content - hide auto-generated content for received messages with attachments */}
          {message.content && !shouldHideContent(message) && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          )}
        </div>
        
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isReceived ? "justify-start" : "justify-end"
        )}>
          <span className="text-xs text-gray-500">
            {(() => {
              const timestamp = message.created_at || message.timestamp;
              if (!timestamp) return '';
              
              try {
                return new Date(timestamp).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
              } catch (e) {
                console.error('Error formatting timestamp:', timestamp, e);
                return '';
              }
            })()}
          </span>
          
          {/* Ícone de falha APENAS quando Evolution API confirma falha definitivamente */}
          {!isReceived && !isNote && message.evolution_status === 'failed' && (
            <AlertTriangle className="w-3 h-3 text-red-500" title="Falha confirmada pela Evolution API" />
          )}
          
          {/* Status 'pending' e 'sent' sem ícone - considerados como enviados com sucesso */}
        </div>
      </div>
      {/* Avatar/Icon for sent messages and notes (right side) */}
      {(isSent || isNote) && (
        <div className="ml-2 mt-1 flex-shrink-0">
          {message.type === 'sent_ai' || message.type === 'sent_system' || message.type === 'note' ? (
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center border",
              message.type === 'note' 
                ? "bg-amber-50 border-amber-200" 
                : "bg-white border-gray-200"
            )}>
              {getMessageTypeIcon(message.type)}
            </div>
          ) : (
            <Avatar className="w-6 h-6">
              <AvatarImage src={message.sender_avatar} />
              <AvatarFallback className="text-xs text-white bg-[#0f766e]">
                {message.sender_type === 'ai' ? (
                  <Bot className="w-3 h-3" />
                ) : (
                  message.sender_name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </div>
  );
}