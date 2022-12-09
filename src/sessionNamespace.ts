import { AbstractSessionNamespace } from './abstractSessionNamespace';
import type { Session } from './session';
import type { NamespaceData, ValueMap } from './types';

export class SessionNamespace<Values extends ValueMap> extends AbstractSessionNamespace<Values> {
  private readonly session: Session<any, Values>;
  private readonly name: string;

  public constructor(session: Session<any, Values>, name: string) {
    super();
    this.session = session;
    this.name = name;
  }

  public isReadable(): boolean {
    return this.session.isReadable();
  }

  public isWritable(): boolean {
    return this.session.isWritable();
  }

  public destroy(): void {
    this.assertWritable();
    this.session.destroyNamespaceData(this.name);
  }

  protected get data(): NamespaceData<Values> {
    return this.session.getNamespaceData(this.name) as any;
  }
}
