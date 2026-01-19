export interface Comment {
  id: string;
  content: string;
  tags: string[];
  characterCount: number;
  maxCharacters: number;
}

export interface CommentContextData {
  orderId: string;
  orderNumber: string;
  title: string;
  elapsedTime: {
    hours: number;
    minutes: number;
    seconds: number;
  };
}
