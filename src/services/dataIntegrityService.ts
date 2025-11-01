import { albumService } from './albumService';
import { User, DataIntegrityReport, CardOwnershipValidation } from '@/types/user';
import { Card } from '@/types/album';
import { UserWithCards } from './userService';

/**
 * Data Integrity Service
 * Ensures CardId references in user CardsOwned arrays correspond to valid card entries
 */
export class DataIntegrityService {
  /**
   * Validates a single user's card ownership
   */
  static async validateUserCardOwnership(user: UserWithCards): Promise<CardOwnershipValidation[]> {
    const validations: CardOwnershipValidation[] = [];
    
    for (const userCard of user.cardsOwned) {
      try {
        // Check if card exists by searching through all cards
        const cardsResponse = await albumService.getCards();
        const cardExists = cardsResponse.data.some(card => card.cardId === userCard.cardId);
        
        validations.push({
          userId: parseInt(user.id), // Convert string ID to number for compatibility
          cardId: userCard.cardId,
          isValid: cardExists,
          error: cardExists ? undefined : `Card with ID '${userCard.cardId}' not found`
        });
      } catch (error) {
        validations.push({
          userId: parseInt(user.id),
          cardId: userCard.cardId,
          isValid: false,
          error: `Error validating card '${userCard.cardId}': ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
    
    return validations;
  }
  
  /**
   * Validates all users' card ownership
   */
  static async validateAllUsersCardOwnership(users: UserWithCards[]): Promise<DataIntegrityReport> {
    const allValidations: CardOwnershipValidation[] = [];
    
    for (const user of users) {
      const userValidations = await this.validateUserCardOwnership(user);
      allValidations.push(...userValidations);
    }
    
    const validCards = allValidations.filter(v => v.isValid).length;
    const invalidCards = allValidations.filter(v => !v.isValid).length;
    const invalidReferences = allValidations.filter(v => !v.isValid);
    
    return {
      totalUsers: users.length,
      totalValidations: allValidations.length,
      validCards,
      invalidCards,
      invalidReferences
    };
  }
  
  /**
   * Removes invalid card references from user's cardsOwned array
   */
  static async cleanupUserCardOwnership(user: UserWithCards): Promise<UserWithCards> {
    const validations = await this.validateUserCardOwnership(user);
    const validCards = validations
      .filter(v => v.isValid)
      .map(v => ({ 
        cardId: v.cardId, 
        quantity: user.cardsOwned.find(c => c.cardId === v.cardId)?.quantity || 1,
        timestamp: user.cardsOwned.find(c => c.cardId === v.cardId)?.timestamp || new Date().toISOString()
      }));
    
    return {
      ...user,
      cardsOwned: validCards
    };
  }
  
  /**
   * Gets all available card IDs from the system
   */
  static async getAvailableCardIds(): Promise<string[]> {
    try {
      const cardsResponse = await albumService.getCards();
      return cardsResponse.data.map(card => card.cardId);
    } catch (error) {
      console.error('Error fetching available card IDs:', error);
      return [];
    }
  }
  
  /**
   * Validates that a card ID exists in the system
   */
  static async validateCardId(cardId: string): Promise<boolean> {
    try {
      const cardsResponse = await albumService.getCards();
      return cardsResponse.data.some(card => card.cardId === cardId);
    } catch (error) {
      console.error('Error validating card ID:', error);
      return false;
    }
  }
  
  /**
   * Adds a card to user's ownership if the card exists
   */
  static async addCardToUser(user: UserWithCards, cardId: string): Promise<{ success: boolean; user?: UserWithCards; error?: string }> {
    // Check if card exists
    const cardExists = await this.validateCardId(cardId);
    if (!cardExists) {
      return {
        success: false,
        error: `Card with ID '${cardId}' does not exist`
      };
    }
    
    // Check if user already owns the card
    if (user.cardsOwned.some(card => card.cardId === cardId)) {
      return {
        success: false,
        error: `User already owns card '${cardId}'`
      };
    }
    
    // Add card to user's ownership
    const updatedUser: UserWithCards = {
      ...user,
      cardsOwned: [...user.cardsOwned, { cardId, quantity: 1, timestamp: new Date().toISOString() }]
    };
    
    return {
      success: true,
      user: updatedUser
    };
  }
  
  /**
   * Removes a card from user's ownership
   */
  static removeCardFromUser(user: UserWithCards, cardId: string): UserWithCards {
    return {
      ...user,
      cardsOwned: user.cardsOwned.filter(card => card.cardId !== cardId)
    };
  }
  
  /**
   * Gets detailed card information for user's owned cards
   */
  static async getUserOwnedCardsDetails(user: UserWithCards): Promise<any[]> {
    try {
      const cardsResponse = await albumService.getCards();
      return cardsResponse.data.filter(card => user.cardsOwned.some(userCard => userCard.cardId === card.cardId));
    } catch (error) {
      console.error('Error fetching user owned cards details:', error);
      return [];
    }
  }
}

export default DataIntegrityService;