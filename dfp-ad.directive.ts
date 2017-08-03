import {
  Directive, ElementRef,
  Input, Output, EventEmitter,
  OnInit, AfterViewInit
} from '@angular/core';

import { DfpService, DfpIDGeneratorService, DfpRefreshService } from "./service";

import { DFPIncompleteError } from "./dfp-errors.class";

declare var googletag;

@Directive({
  selector: 'dfp-ad'
})
export class DfpAdDirective implements OnInit, AfterViewInit {

  @Input() adUnit: string;
  @Input() clickUrl: string;
  @Input() forceSafeFrame: boolean;
  @Input() safeFrameConfig: string;
  @Input() refresh: string;
  @Input() collapseIfEmpty: boolean;

  @Output() afterRefresh: EventEmitter<any> = new EventEmitter();

  private sizes = [];

  private responsiveMapping = [];

  private targetings = [];

  private exclusions = [];

  private scripts = [];

  private slot: any;

  constructor(
    private elementRef: ElementRef,
    private dfp: DfpService,
    private dfpIDGenerator: DfpIDGeneratorService,
    private dfpRefresh: DfpRefreshService
  ) { }

  ngOnInit() {
    this.dfpIDGenerator.dfpIDGenerator(this.elementRef.nativeElement);
  }

  ngAfterViewInit() {
    this.dfp.defineTask(() => {
      this.defineSlot();
    });
  }

  private setResponsiveMapping(slot) {
    let ad = this.getState();

    let sizeMapping = googletag.sizeMapping();

    if (ad.responsiveMapping.length === 0) {
      ad.sizes.forEach(function (size) {
        sizeMapping.addSize([size[0], 0], [size]);
      });
    } else {
      ad.responsiveMapping.forEach(function (mapping) {
        sizeMapping.addSize(mapping.viewportSize, mapping.adSizes);
      });
    }

    slot.defineSizeMapping(sizeMapping.build());
  }

  private extractViewportDimensions(responsiveMappings) {
    return responsiveMappings.map(mapping => ({
      width: mapping.viewportSize[0],
      height: mapping.viewportSize[1]
    }));
  }

  private defineSlot() {
    let ad = this.getState(),
      element = this.elementRef.nativeElement;

    this.slot = googletag.defineSlot(ad.adUnit, ad.sizes, element.id);

    if (ad.forceSafeFrame !== undefined) {
      this.slot.setForceSafeFrame(true);
    }

    if (ad.clickUrl) {
      this.slot.setClickUrl(ad.clickUrl);
    }

    if (ad.collapseIfEmpty) {
      this.slot.setCollapseEmptyDiv(true, true);
    }

    if (ad.safeFrameConfig) {
      this.slot.setSafeFrameConfig(
        /** @type {googletag.SafeFrameConfig} */
        (JSON.parse(ad.safeFrameConfig))
      );
    }

    this.setResponsiveMapping(this.slot);

    ad.targetings.forEach(targeting => {
      this.slot.setTargeting(targeting.key, targeting.values);
    });

    ad.exclusions.forEach(exclusion => {
      this.slot.setCategoryExclusion(exclusion);
    });

    ad.scripts.forEach(script => { script(this.slot); });

    this.slot.addService(googletag.pubads());

    googletag.display(element.id);

    this.refreshContent();
  }

  ngOnDestroy() {
    googletag.destroySlots([this.slot]);
  }

  private refreshContent() {
     console.log(this.refresh)
    this.dfpRefresh.slotRefresh(this.slot, this.refresh).then(() => {
      this.afterRefresh.emit(this.slot);
    });
  }

  checkValid() {
    if (this.sizes.length === 0) {
      throw new DFPIncompleteError('dfp-ad', 'dfp-size');
    }
    if (!this.adUnit) {
      throw new DFPIncompleteError('dfp-ad', 'ad-unit', true);
    }
  }

  getState() {
    this.checkValid();
    return Object.freeze({
      sizes: this.sizes,
      responsiveMapping: this.responsiveMapping,
      targetings: this.targetings,
      exclusions: this.exclusions,
      adUnit: this.adUnit,
      forceSafeFrame: this.forceSafeFrame == true,
      safeFrameConfig: this.safeFrameConfig,
      clickUrl: this.clickUrl,
      refresh: this.refresh,
      scripts: this.scripts,
      collapseIfEmpty: this.collapseIfEmpty == true
    });
  }

  addSize(size) {
    this.sizes.push(size);
  }

  addResponsiveMapping(mapping) {
    this.responsiveMapping.push(mapping);
  }

  addTargeting(targeting) {
    this.targetings.push(targeting);
  }

  addExclusion(exclusion) {
    this.exclusions.push(exclusion);
  }

  addScript(script) {
    this.scripts.push(script);
  }

}
