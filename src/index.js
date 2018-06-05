import viewDecorator from './view';
import modelDecorator, {
  getType as getTypeFromModel,
  getParent as getOurParent,
} from './model';
import mutationDecorator, { flow as ourFlow } from './mutation';
import fieldDecorator from './field';

export const getParent = getOurParent;
export const flow = ourFlow;
export const view = viewDecorator;
export const model = modelDecorator;
export const mutation = mutationDecorator;
export const field = fieldDecorator;
export const getType = getTypeFromModel;
