export type UserRef = {
    id: string;
    name: string;
    uToken?: string;
  };
  
  export type User = {
    id: string;
    name: string;
    email?: string;
    profileImageUrl?: string;
    // add any other properties you use for full users
  };
  
