/**
 * AI Pause Service - Sistema de Pausa Automática da IA
 * Detecta mensagens manuais de profissionais e pausa IA automaticamente
 */

export interface AiPauseContext {
  conversationId: string | number;
  clinicId: number;
  senderId: string;
  senderType: 'patient' | 'professional' | 'ai' | 'system';
  deviceType: 'manual' | 'system';
  messageContent: string;
  timestamp: Date;
}

export interface AiPauseResult {
  shouldPause: boolean;
  pausedUntil?: Date;
  pauseReason?: string;
  pausedByUserId?: number;
}

export interface LiviaConfiguration {
  off_duration: number;
  off_unit: string;
}

export class AiPauseService {
  private static instance: AiPauseService;
  
  public static getInstance(): AiPauseService {
    if (!AiPauseService.instance) {
      AiPauseService.instance = new AiPauseService();
    }
    return AiPauseService.instance;
  }

  /**
   * Detecta se uma mensagem deve pausar a IA
   * Critério: sender_type = 'professional' AND device_type = 'manual' ou 'system'
   */
  public shouldPauseAi(context: AiPauseContext, currentAiActive?: boolean, currentPauseReason?: string): boolean {
    console.log('🔍 AI PAUSE: Analisando se deve pausar IA...', {
      conversationId: context.conversationId,
      senderType: context.senderType,
      deviceType: context.deviceType,
      senderId: context.senderId,
      currentAiActive,
      currentPauseReason
    });

    // PROTEÇÃO: Se IA foi desativada manualmente, não aplicar pausa automática
    if (currentAiActive === false && currentPauseReason === 'manual') {
      console.log('🚫 AI PAUSE: IA desativada manualmente - não aplicar pausa automática');
      return false;
    }

    // PROTEÇÃO: Só aplicar pausa se IA estiver atualmente ativa
    if (currentAiActive === false) {
      console.log('🚫 AI PAUSE: IA já está inativa - não aplicar pausa automática');
      return false;
    }

    // Regra principal: profissional enviando mensagem (manual OU system)
    const isProfessionalMessage = 
      context.senderType === 'professional' && 
      (context.deviceType === 'manual' || context.deviceType === 'system');

    if (isProfessionalMessage) {
      console.log('✅ AI PAUSE: Mensagem de profissional detectada - IA deve ser pausada', {
        senderType: context.senderType,
        deviceType: context.deviceType,
        trigger: context.deviceType === 'manual' ? 'manual_message' : 'system_web_message'
      });
      return true;
    }

    console.log('⏭️ AI PAUSE: Mensagem não requer pausa da IA', {
      senderType: context.senderType,
      deviceType: context.deviceType,
      reason: context.senderType !== 'professional' ? 'sender_not_professional' : 'device_not_manual_or_system'
    });

    return false;
  }

  /**
   * Calcula por quanto tempo a IA deve ficar pausada
   * Baseado na configuração da clínica (off_duration + off_unit)
   */
  public calculatePauseDuration(
    liviaConfig: LiviaConfiguration,
    currentTime: Date = new Date()
  ): Date {
    const duration = liviaConfig.off_duration || 30; // padrão 30
    const unit = liviaConfig.off_unit || 'minutes'; // padrão minutes

    console.log('⏰ AI PAUSE: Calculando duração da pausa...', {
      duration,
      unit,
      currentTime: currentTime.toISOString()
    });

    const pauseEnd = new Date(currentTime);

    switch (unit) {
      case 'minutes':
      case 'minutos':
        pauseEnd.setMinutes(pauseEnd.getMinutes() + duration);
        break;
      case 'hours':
      case 'horas':
        pauseEnd.setHours(pauseEnd.getHours() + duration);
        break;
      case 'days':
      case 'dias':
        pauseEnd.setDate(pauseEnd.getDate() + duration);
        break;
      default:
        // Fallback para minutos
        pauseEnd.setMinutes(pauseEnd.getMinutes() + duration);
        console.log('⚠️ AI PAUSE: Unidade desconhecida, usando minutos como fallback');
    }

    console.log('✅ AI PAUSE: Pausa calculada até:', pauseEnd.toISOString());
    return pauseEnd;
  }

  /**
   * Processa mensagem e retorna resultado da análise de pausa
   */
  public async processMessage(
    context: AiPauseContext,
    liviaConfig: LiviaConfiguration,
    currentAiActive?: boolean,
    currentPauseReason?: string
  ): Promise<AiPauseResult> {
    console.log('🚀 AI PAUSE: Processando mensagem para sistema de pausa da IA', {
      currentAiActive,
      currentPauseReason
    });

    const shouldPause = this.shouldPauseAi(context, currentAiActive, currentPauseReason);

    if (!shouldPause) {
      return {
        shouldPause: false
      };
    }

    // Calcular duração da pausa
    const pausedUntil = this.calculatePauseDuration(liviaConfig);

    // Extrair user_id do sender_id (pode ser numero ou string)
    const pausedByUserId = this.extractUserId(context.senderId);

    const result: AiPauseResult = {
      shouldPause: true,
      pausedUntil,
      pauseReason: 'manual_message',
      pausedByUserId
    };

    console.log('✅ AI PAUSE: Resultado da análise de pausa:', {
      shouldPause: result.shouldPause,
      pausedUntil: result.pausedUntil?.toISOString(),
      pauseReason: result.pauseReason,
      pausedByUserId: result.pausedByUserId
    });

    return result;
  }

  /**
   * Verifica se IA está atualmente pausada
   */
  public isAiCurrentlyPaused(
    aiPausedUntil: Date | null | undefined,
    currentTime: Date = new Date()
  ): boolean {
    if (!aiPausedUntil) {
      return false;
    }

    const isPaused = aiPausedUntil > currentTime;
    
    console.log('🔍 AI PAUSE: Verificando se IA está pausada...', {
      aiPausedUntil: aiPausedUntil.toISOString(),
      currentTime: currentTime.toISOString(),
      isPaused
    });

    return isPaused;
  }

  /**
   * Verifica se uma conversa deve receber resposta da IA
   * Leva em conta tanto ai_active quanto ai_paused_until
   */
  public shouldAiRespond(
    aiActive: boolean,
    aiPausedUntil: Date | null | undefined,
    currentTime: Date = new Date()
  ): boolean {
    // Primeiro verifica se IA está ativa para a conversa
    if (!aiActive) {
      console.log('⏸️ AI PAUSE: IA desativada para esta conversa (ai_active = false)');
      return false;
    }

    // Depois verifica se IA está pausada temporariamente
    const isPaused = this.isAiCurrentlyPaused(aiPausedUntil, currentTime);
    
    if (isPaused) {
      console.log('⏸️ AI PAUSE: IA temporariamente pausada até:', aiPausedUntil?.toISOString());
      return false;
    }

    console.log('✅ AI PAUSE: IA pode responder (ativa e não pausada)');
    return true;
  }

  /**
   * Helper: Extrai user_id numérico do sender_id
   */
  private extractUserId(senderId: string): number | undefined {
    try {
      const numericId = parseInt(senderId, 10);
      return isNaN(numericId) ? undefined : numericId;
    } catch (error) {
      console.log('⚠️ AI PAUSE: Não foi possível extrair user_id do sender_id:', senderId);
      return undefined;
    }
  }

  /**
   * Reseta pausa da IA (usado quando ativando manualmente)
   */
  public resetAiPause(): { aiPausedUntil: null; aiPauseReason: null; aiPausedByUserId: null } {
    console.log('🔄 AI PAUSE: Resetando pausa da IA');
    return {
      aiPausedUntil: null,
      aiPauseReason: null,
      aiPausedByUserId: null
    };
  }

  /**
   * Formata tempo restante de pausa para exibição
   */
  public formatPauseTimeRemaining(
    aiPausedUntil: Date | null | undefined,
    currentTime: Date = new Date()
  ): string | null {
    if (!aiPausedUntil || !this.isAiCurrentlyPaused(aiPausedUntil, currentTime)) {
      return null;
    }

    const diffMs = aiPausedUntil.getTime() - currentTime.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    }

    const diffHours = Math.ceil(diffMinutes / 60);
    return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }
}

export const aiPauseService = AiPauseService.getInstance(); 